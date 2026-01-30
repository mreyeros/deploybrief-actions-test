# DeployBrief GitHub Actions - Test Repository

This repository is used to test and validate the DeployBrief GitHub Actions before publishing to the GitHub Marketplace.

## Actions Being Tested

### 1. 🚀 Release Notes Action

**Location:** `.github/actions/release-notes`

Generates professional release notes from GitHub pull requests and commits.

### 2. 📚 Wiki Publisher Action

**Location:** `.github/actions/wiki-publisher`

Automatically publishes documentation to GitHub Wiki.

### 3. ✅ Evidence Gate Action

**Location:** `.github/actions/evidence-gate`

Validates pull request requirements before allowing merges.

## Test Workflows

- **test-release-notes.yml** - Tests release notes generation
- **test-wiki-publisher.yml** - Tests wiki publishing
- **test-evidence-gate.yml** - Tests PR validation

## Running Tests

### Test 1: Release Notes Action

1. Go to **Actions** tab
2. Select **"Test Release Notes"** workflow
3. Click **"Run workflow"**
4. Check the workflow summary for generated notes

### Test 2: Wiki Publisher Action

**Prerequisites:**

- Enable Wiki in repository settings
- Create initial wiki page

**Steps:**

1. Settings → Features → ✅ Enable Wikis
2. Go to Wiki tab and create first page
3. Go to Actions tab → "Test Wiki Publisher"
4. Run workflow
5. Check Wiki for published content

### Test 3: Evidence Gate Action

1. Create test branch: `git checkout -b test-pr`
2. Make a change: `echo "test" >> README.md`
3. Push and create PR
4. Observe Evidence Gate validation
5. Add required labels/approvals
6. Watch validation pass

## Test Status

- [ ] Release Notes Action - Ready to test
- [ ] Wiki Publisher Action - Ready to test (needs wiki enabled)
- [ ] Evidence Gate Action - Ready to test (needs PR)

## Links

- **Source Repository:** [deploybrief](https://github.com/mreyeros-development/DeployBrief)
- **Documentation:** See `.github/actions/*/README.md` for each action
- **Issues:** Report any issues in the main DeployBrief repository

---

**Status:** 🧪 Testing Phase - Not for production use
