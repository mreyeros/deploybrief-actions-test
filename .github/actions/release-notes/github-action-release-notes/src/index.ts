import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";
import * as fs from "fs";
import * as path from "path";

interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  htmlUrl: string;
  mergedAt: string | null;
  labels: string[];
  author: string;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface ReleaseNotesSection {
  title: string;
  items: string[];
}

async function run(): Promise<void> {
  try {
    // Get inputs
    const token = core.getInput("github-token", { required: true });
    const tagName = core.getInput("tag-name") || "";
    const previousTag = core.getInput("previous-tag") || "";
    const outputFile = core.getInput("output-file") || "release-notes.md";
    const includeCommitDetails = core.getBooleanInput("include-commit-details");
    const includePrDetails = core.getBooleanInput("include-pr-details");
    const groupByLabel = core.getBooleanInput("group-by-label");

    core.info("🚀 DeployBrief Release Notes Generator");
    core.info(
      `Repository: ${github.context.repo.owner}/${github.context.repo.repo}`,
    );

    // Initialize Octokit
    const octokit = new Octokit({ auth: token });
    const { owner, repo } = github.context.repo;

    // Determine tags to compare
    let currentTag = tagName;
    let previousTagName = previousTag;

    if (!currentTag) {
      core.info("No tag specified, fetching latest tag...");
      const { data: tags } = await octokit.repos.listTags({
        owner,
        repo,
        per_page: 1,
      });

      if (tags.length === 0) {
        throw new Error("No tags found in repository");
      }

      currentTag = tags[0].name;
      core.info(`Using latest tag: ${currentTag}`);
    }

    if (!previousTagName) {
      core.info("No previous tag specified, fetching previous tag...");
      const { data: tags } = await octokit.repos.listTags({
        owner,
        repo,
        per_page: 100,
      });

      const currentIndex = tags.findIndex((t) => t.name === currentTag);
      if (currentIndex >= 0 && currentIndex < tags.length - 1) {
        previousTagName = tags[currentIndex + 1].name;
        core.info(`Using previous tag: ${previousTagName}`);
      } else {
        core.warning("No previous tag found, comparing against first commit");
      }
    }

    // Get commit comparison
    core.info(
      `Comparing ${previousTagName || "initial commit"} ... ${currentTag}`,
    );

    const compareResult = previousTagName
      ? await octokit.repos.compareCommits({
          owner,
          repo,
          base: previousTagName,
          head: currentTag,
        })
      : { data: { commits: [] } };

    const commits: Commit[] = compareResult.data.commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author?.name || "Unknown",
      date: c.commit.author?.date || "",
      url: c.html_url,
    }));

    core.info(`Found ${commits.length} commits`);

    // Get merged pull requests
    const pullRequests: PullRequest[] = [];

    if (includePrDetails) {
      core.info("Fetching merged pull requests...");

      for (const commit of commits) {
        // Check if commit is associated with a PR
        const { data: prs } =
          await octokit.repos.listPullRequestsAssociatedWithCommit({
            owner,
            repo,
            commit_sha: commit.sha,
          });

        for (const pr of prs) {
          if (
            pr.merged_at &&
            !pullRequests.find((p) => p.number === pr.number)
          ) {
            pullRequests.push({
              number: pr.number,
              title: pr.title,
              body: pr.body,
              htmlUrl: pr.html_url,
              mergedAt: pr.merged_at,
              labels: pr.labels.map((l) =>
                typeof l === "string" ? l : l.name || "",
              ),
              author: pr.user?.login || "Unknown",
            });
          }
        }
      }

      core.info(`Found ${pullRequests.length} merged pull requests`);
    }

    // Generate release notes
    const releaseNotes = generateReleaseNotes({
      currentTag,
      previousTag: previousTagName,
      commits,
      pullRequests,
      includeCommitDetails,
      includePrDetails,
      groupByLabel,
      owner,
      repo,
    });

    // Write to file
    const outputPath = path.resolve(outputFile);
    fs.writeFileSync(outputPath, releaseNotes, "utf8");
    core.info(`✓ Release notes written to: ${outputPath}`);

    // Set outputs
    core.setOutput("release-notes", releaseNotes);
    core.setOutput("release-notes-file", outputPath);
    core.setOutput("pr-count", pullRequests.length);
    core.setOutput("commit-count", commits.length);

    core.info("✓ Release notes generated successfully");
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unknown error occurred");
    }
  }
}

interface GenerateOptions {
  currentTag: string;
  previousTag: string;
  commits: Commit[];
  pullRequests: PullRequest[];
  includeCommitDetails: boolean;
  includePrDetails: boolean;
  groupByLabel: boolean;
  owner: string;
  repo: string;
}

function generateReleaseNotes(options: GenerateOptions): string {
  const {
    currentTag,
    previousTag,
    commits,
    pullRequests,
    includeCommitDetails,
    includePrDetails,
    groupByLabel,
    owner,
    repo,
  } = options;

  let markdown = `# 📋 Release Notes – ${currentTag}\n\n`;

  // Overview section
  markdown += `## 📦 Overview\n\n`;
  markdown += `**Release**: ${currentTag}\n`;
  if (previousTag) {
    markdown += `**Previous Release**: ${previousTag}\n`;
  }
  markdown += `**Date**: ${new Date().toISOString().split("T")[0]}\n`;
  markdown += `**Repository**: [${owner}/${repo}](https://github.com/${owner}/${repo})\n\n`;

  // Summary
  markdown += `## 📊 Summary\n\n`;
  markdown += `- **Pull Requests**: ${pullRequests.length}\n`;
  markdown += `- **Commits**: ${commits.length}\n`;
  markdown += `- **Contributors**: ${getUniqueContributors(commits, pullRequests).length}\n\n`;

  // Pull Requests section (grouped by label if enabled)
  if (includePrDetails && pullRequests.length > 0) {
    if (groupByLabel) {
      const sections = groupPullRequestsByLabel(pullRequests);

      for (const section of sections) {
        markdown += `## ${section.title}\n\n`;
        for (const item of section.items) {
          markdown += `${item}\n`;
        }
        markdown += "\n";
      }
    } else {
      markdown += `## 🔀 Pull Requests (${pullRequests.length})\n\n`;
      for (const pr of pullRequests.sort((a, b) => b.number - a.number)) {
        markdown += `- **[#${pr.number}](${pr.htmlUrl})** ${pr.title} by @${pr.author}\n`;
      }
      markdown += "\n";
    }
  }

  // Commits section
  if (includeCommitDetails && commits.length > 0) {
    markdown += `## 📝 Commits (${commits.length})\n\n`;
    for (const commit of commits) {
      const shortSha = commit.sha.substring(0, 7);
      const firstLine = commit.message.split("\n")[0];
      markdown += `- [\`${shortSha}\`](${commit.url}) ${firstLine} - ${commit.author}\n`;
    }
    markdown += "\n";
  }

  // Contributors
  const contributors = getUniqueContributors(commits, pullRequests);
  if (contributors.length > 0) {
    markdown += `## 👥 Contributors\n\n`;
    markdown += `Thank you to all contributors:\n\n`;
    for (const contributor of contributors.sort()) {
      markdown += `- @${contributor}\n`;
    }
    markdown += "\n";
  }

  // Footer
  markdown += `---\n\n`;
  markdown += `_Release notes generated by [DeployBrief](https://deploybrief.com) on ${new Date().toISOString()}_\n`;

  return markdown;
}

function groupPullRequestsByLabel(prs: PullRequest[]): ReleaseNotesSection[] {
  const sections: Map<string, PullRequest[]> = new Map();

  // Define label categories with emojis
  const categories: Record<string, string> = {
    feature: "✨ Features",
    enhancement: "🚀 Enhancements",
    bug: "🐛 Bug Fixes",
    bugfix: "🐛 Bug Fixes",
    fix: "🐛 Bug Fixes",
    documentation: "📚 Documentation",
    docs: "📚 Documentation",
    performance: "⚡ Performance",
    perf: "⚡ Performance",
    security: "🔒 Security",
    dependencies: "📦 Dependencies",
    deps: "📦 Dependencies",
    breaking: "💥 Breaking Changes",
    "breaking-change": "💥 Breaking Changes",
  };

  // Group PRs by their primary label
  for (const pr of prs) {
    let categorized = false;

    for (const label of pr.labels) {
      const normalizedLabel = label.toLowerCase();
      const category = categories[normalizedLabel];

      if (category) {
        if (!sections.has(category)) {
          sections.set(category, []);
        }
        sections.get(category)!.push(pr);
        categorized = true;
        break;
      }
    }

    // If no matching category, add to "Other Changes"
    if (!categorized) {
      const otherKey = "🔧 Other Changes";
      if (!sections.has(otherKey)) {
        sections.set(otherKey, []);
      }
      sections.get(otherKey)!.push(pr);
    }
  }

  // Convert to sections array with priority ordering
  const priorityOrder = [
    "💥 Breaking Changes",
    "✨ Features",
    "🚀 Enhancements",
    "🐛 Bug Fixes",
    "🔒 Security",
    "⚡ Performance",
    "📚 Documentation",
    "📦 Dependencies",
    "🔧 Other Changes",
  ];

  const result: ReleaseNotesSection[] = [];

  for (const title of priorityOrder) {
    const prs = sections.get(title);
    if (prs && prs.length > 0) {
      result.push({
        title,
        items: prs
          .sort((a, b) => b.number - a.number)
          .map(
            (pr) =>
              `- **[#${pr.number}](${pr.htmlUrl})** ${pr.title} by @${pr.author}`,
          ),
      });
    }
  }

  return result;
}

function getUniqueContributors(
  commits: Commit[],
  prs: PullRequest[],
): string[] {
  const contributors = new Set<string>();

  for (const commit of commits) {
    if (commit.author && commit.author !== "Unknown") {
      contributors.add(commit.author);
    }
  }

  for (const pr of prs) {
    if (pr.author && pr.author !== "Unknown") {
      contributors.add(pr.author);
    }
  }

  return Array.from(contributors);
}

run();
