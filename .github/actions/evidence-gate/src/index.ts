import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";

interface Violation {
  rule: string;
  message: string;
  severity: "error" | "warning";
}

async function run(): Promise<void> {
  try {
    // Get inputs
    const token = core.getInput("github-token", { required: true });
    const requireLabels = core
      .getInput("require-labels")
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l);
    const requireLinkedIssue = core.getBooleanInput("require-linked-issue");
    const requireDescription = core.getBooleanInput("require-description");
    const requireEvidenceAttachments = core.getBooleanInput(
      "require-evidence-attachments",
    );
    const requireTests = core.getBooleanInput("require-tests");
    const blockedLabels = core
      .getInput("blocked-labels")
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l);
    const failOnViolation = core.getBooleanInput("fail-on-violation");

    core.info("🛡️ DeployBrief Evidence Gate");

    // Get PR context
    const context = github.context;
    if (!context.payload.pull_request) {
      core.warning("This action should be run on pull_request events");
      return;
    }

    const pr = context.payload.pull_request;
    const { owner, repo } = context.repo;
    const prNumber = pr.number;

    core.info(`Validating PR #${prNumber}: ${pr.title}`);

    // Initialize Octokit
    const octokit = new Octokit({ auth: token });

    // Collect violations
    const violations: Violation[] = [];

    // Check 1: Required Labels
    if (requireLabels.length > 0) {
      const prLabels = pr.labels.map((l: any) => l.name);
      const missingLabels = requireLabels.filter(
        (required) => !prLabels.includes(required),
      );

      if (missingLabels.length > 0) {
        violations.push({
          rule: "require-labels",
          message: `Missing required labels: ${missingLabels.join(", ")}`,
          severity: "error",
        });
      } else {
        core.info(`✓ All required labels present: ${requireLabels.join(", ")}`);
      }
    }

    // Check 2: Blocked Labels
    if (blockedLabels.length > 0) {
      const prLabels = pr.labels.map((l: any) => l.name);
      const foundBlockedLabels = blockedLabels.filter((blocked) =>
        prLabels.includes(blocked),
      );

      if (foundBlockedLabels.length > 0) {
        violations.push({
          rule: "blocked-labels",
          message: `PR has blocking labels: ${foundBlockedLabels.join(", ")}`,
          severity: "error",
        });
      } else {
        core.info("✓ No blocking labels found");
      }
    }

    // Check 3: Description
    if (requireDescription) {
      const body = pr.body || "";
      if (body.trim().length === 0) {
        violations.push({
          rule: "require-description",
          message: "PR description is empty",
          severity: "error",
        });
      } else {
        core.info(`✓ PR has description (${body.length} characters)`);
      }
    }

    // Check 4: Linked Issue
    if (requireLinkedIssue) {
      const body = pr.body || "";
      // Check for common issue linking patterns: #123, fixes #123, closes #123, etc.
      const issuePattern = /(close[sd]?|fix(es|ed)?|resolve[sd]?)\s+#\d+|#\d+/i;

      if (!issuePattern.test(body)) {
        violations.push({
          rule: "require-linked-issue",
          message:
            'PR is not linked to an issue (use "fixes #123" or "#123" in description)',
          severity: "error",
        });
      } else {
        core.info("✓ PR is linked to an issue");
      }
    }

    // Check 5: Evidence Attachments
    if (requireEvidenceAttachments) {
      // Check PR description for images or file references
      const body = pr.body || "";
      const hasImageInDescription = /!\[.*?\]\(.*?\)/.test(body); // Markdown images
      const hasFileAttachment = /<img|<a.*?href.*?download/i.test(body); // HTML attachments

      // Check PR comments for attachments
      const { data: comments } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
      });

      const hasImageInComments = comments.some(
        (c) =>
          /!\[.*?\]\(.*?\)/.test(c.body || "") ||
          /<img|<a.*?href.*?download/i.test(c.body || ""),
      );

      if (!hasImageInDescription && !hasImageInComments && !hasFileAttachment) {
        violations.push({
          rule: "require-evidence-attachments",
          message:
            "No evidence attachments found. Please attach screenshots, documents, or other evidence in the PR description or comments",
          severity: "error",
        });
      } else {
        core.info("✓ Evidence attachments found");
      }
    }

    // Check 6: Tests Passing
    if (requireTests) {
      const { data: checks } = await octokit.checks.listForRef({
        owner,
        repo,
        ref: pr.head.sha,
      });

      const testChecks = checks.check_runs.filter((check) =>
        check.name.toLowerCase().includes("test"),
      );

      if (testChecks.length === 0) {
        violations.push({
          rule: "require-tests",
          message: "No test checks found",
          severity: "warning",
        });
      } else {
        const failedTests = testChecks.filter(
          (check) =>
            check.conclusion === "failure" || check.conclusion === "cancelled",
        );

        if (failedTests.length > 0) {
          violations.push({
            rule: "require-tests",
            message: `${failedTests.length} test check(s) failed`,
            severity: "error",
          });
        } else {
          core.info(`✓ All ${testChecks.length} test checks passed`);
        }
      }
    }

    // Output results
    const passed =
      violations.filter((v) => v.severity === "error").length === 0;

    core.setOutput("validation-result", passed ? "passed" : "failed");
    core.setOutput("violations", JSON.stringify(violations));
    core.setOutput("violation-count", violations.length);

    // Log summary
    if (violations.length === 0) {
      core.info("✅ All validation checks passed!");
    } else {
      core.info(`\n⚠️ Found ${violations.length} violation(s):\n`);

      for (const violation of violations) {
        const icon = violation.severity === "error" ? "❌" : "⚠️";
        core.info(`${icon} [${violation.rule}] ${violation.message}`);
      }
    }

    // Add PR comment with results
    const commentBody = generateCommentBody(violations, passed);

    try {
      // Check if we already commented
      const { data: comments } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
      });

      const botComment = comments.find(
        (c) => c.user?.type === "Bot" && c.body?.includes("🛡️ Evidence Gate"),
      );

      if (botComment) {
        // Update existing comment
        await octokit.issues.updateComment({
          owner,
          repo,
          comment_id: botComment.id,
          body: commentBody,
        });
      } else {
        // Create new comment
        await octokit.issues.createComment({
          owner,
          repo,
          issue_number: prNumber,
          body: commentBody,
        });
      }
    } catch (error) {
      core.warning(`Failed to post PR comment: ${error}`);
    }

    // Fail if configured and violations found
    if (!passed && failOnViolation) {
      core.setFailed(
        `Evidence gate validation failed with ${violations.length} violation(s)`,
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unknown error occurred");
    }
  }
}

function generateCommentBody(violations: Violation[], passed: boolean): string {
  let body = "## 🛡️ Evidence Gate Validation\n\n";

  if (passed) {
    body += "### ✅ All Checks Passed\n\n";
    body +=
      "This pull request meets all required evidence and quality standards.\n\n";
    body += "---\n";
    body +=
      "_Validation performed by [DeployBrief Evidence Gate](https://deploybrief.com)_\n";
  } else {
    body += "### ❌ Validation Failed\n\n";
    body += `Found ${violations.length} violation(s) that must be resolved:\n\n`;

    // Group by severity
    const errors = violations.filter((v) => v.severity === "error");
    const warnings = violations.filter((v) => v.severity === "warning");

    if (errors.length > 0) {
      body += "#### ❌ Errors\n\n";
      for (const violation of errors) {
        body += `- **${violation.rule}**: ${violation.message}\n`;
      }
      body += "\n";
    }

    if (warnings.length > 0) {
      body += "#### ⚠️ Warnings\n\n";
      for (const warning of warnings) {
        body += `- **${warning.rule}**: ${warning.message}\n`;
      }
      body += "\n";
    }

    body += "---\n";
    body +=
      "_Please resolve these issues before merging. Validation performed by [DeployBrief Evidence Gate](https://deploybrief.com)_\n";
  }

  return body;
}

run();
