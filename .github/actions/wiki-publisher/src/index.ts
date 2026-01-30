import * as core from "@actions/core";
import * as github from "@actions/github";
import * as exec from "@actions/exec";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

async function run(): Promise<void> {
  try {
    // Get inputs
    const token = core.getInput("github-token", { required: true });
    const sourceFile = core.getInput("source-file", { required: true });
    const wikiPage = core.getInput("wiki-page", { required: true });
    const commitMessage =
      core.getInput("commit-message") || "Update wiki from workflow";
    const skipIfNoChanges = core.getBooleanInput("skip-if-no-changes");
    const gitUserName = core.getInput("git-user-name") || "github-actions[bot]";
    const gitUserEmail =
      core.getInput("git-user-email") ||
      "github-actions[bot]@users.noreply.github.com";

    core.info("📚 DeployBrief Wiki Publisher");
    core.info(
      `Repository: ${github.context.repo.owner}/${github.context.repo.repo}`,
    );
    core.info(`Wiki Page: ${wikiPage}`);

    // Verify source file exists
    if (!fs.existsSync(sourceFile)) {
      throw new Error(`Source file not found: ${sourceFile}`);
    }

    const sourceContent = fs.readFileSync(sourceFile, "utf8");
    core.info(`✓ Source content loaded (${sourceContent.length} bytes)`);

    // Create temp directory for wiki clone
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wiki-"));
    core.info(`Using temp directory: ${tempDir}`);

    try {
      // Construct wiki repository URL
      const { owner, repo } = github.context.repo;
      const wikiUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.wiki.git`;

      // Clone wiki repository
      core.info("Cloning wiki repository...");
      await exec.exec("git", ["clone", wikiUrl, tempDir]);
      core.info("✓ Wiki cloned successfully");

      // Configure git
      await exec.exec("git", ["config", "user.name", gitUserName], {
        cwd: tempDir,
      });
      await exec.exec("git", ["config", "user.email", gitUserEmail], {
        cwd: tempDir,
      });

      // Determine wiki page path
      const wikiPagePath = path.join(tempDir, `${wikiPage}.md`);

      // Check if content has changed
      let contentChanged = true;
      if (fs.existsSync(wikiPagePath)) {
        const existingContent = fs.readFileSync(wikiPagePath, "utf8");
        if (existingContent === sourceContent) {
          contentChanged = false;
          if (skipIfNoChanges) {
            core.info("✓ Content unchanged - skipping update");
            core.setOutput("changes-made", "false");
            core.setOutput(
              "wiki-url",
              `https://github.com/${owner}/${repo}/wiki/${wikiPage}`,
            );
            core.setOutput("wiki-page-path", wikiPage);
            return;
          }
        }
      }

      // Write content to wiki page
      fs.writeFileSync(wikiPagePath, sourceContent, "utf8");
      core.info(`✓ Content written to: ${wikiPage}.md`);

      // Add and commit changes
      await exec.exec("git", ["add", `${wikiPage}.md`], { cwd: tempDir });

      // Check if there are changes to commit
      let hasChanges = false;
      await exec.exec("git", ["diff", "--staged", "--quiet"], {
        cwd: tempDir,
        ignoreReturnCode: true,
        listeners: {
          errline: () => {
            hasChanges = true;
          },
        },
      });

      if (!hasChanges) {
        core.info("✓ No changes to commit");
        core.setOutput("changes-made", "false");
        core.setOutput(
          "wiki-url",
          `https://github.com/${owner}/${repo}/wiki/${wikiPage}`,
        );
        core.setOutput("wiki-page-path", wikiPage);
        return;
      }

      await exec.exec("git", ["commit", "-m", commitMessage], { cwd: tempDir });
      core.info("✓ Changes committed");

      // Push to wiki
      await exec.exec("git", ["push", "origin", "master"], { cwd: tempDir });
      core.info("✓ Changes pushed to wiki successfully");

      // Set outputs
      const wikiPageUrl = `https://github.com/${owner}/${repo}/wiki/${wikiPage}`;
      core.setOutput("wiki-url", wikiPageUrl);
      core.setOutput("wiki-page-path", wikiPage);
      core.setOutput("changes-made", "true");

      core.info(`✓ Wiki page published: ${wikiPageUrl}`);
    } finally {
      // Cleanup temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        core.info("✓ Cleaned up temp directory");
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("An unknown error occurred");
    }
  }
}

run();
