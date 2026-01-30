# DeployBrief Release Notes - GitHub Action

Generate professional, comprehensive release notes for your GitHub releases automatically from pull requests and commits.

## Features

- 📋 **Automatic Generation** - Generates release notes from merged PRs and commits
- 🏷️ **Label Grouping** - Organizes changes by PR labels (features, bugs, docs, etc.)
- 👥 **Contributors** - Automatically lists all contributors
- 📊 **Statistics** - Includes PR count, commit count, and contributor metrics
- 🎨 **Professional Format** - Clean, readable markdown with emojis and links
- ⚙️ **Configurable** - Customize what gets included in the notes

## Usage

### Basic Example

```yaml
name: Create Release
on:
  push:
    tags:
      - "v*"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Important: fetch all history for proper tag comparison

      - name: Generate Release Notes
        id: release_notes
        uses: your-org/deploybrief-release-notes-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          tag-name: ${{ github.ref_name }}

      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref_name }}
          release_name: Release ${{ github.ref_name }}
          body_path: ${{ steps.release_notes.outputs.release-notes-file }}
          draft: false
          prerelease: false
```

### Advanced Example

```yaml
name: Create Release with Custom Sections
on:
  push:
    tags:
      - "v*"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate Release Notes
        id: release_notes
        uses: your-org/deploybrief-release-notes-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          tag-name: ${{ github.ref_name }}
          previous-tag: v1.0.0 # Optional: specify previous tag manually
          output-file: RELEASE_NOTES.md
          include-commit-details: true
          include-pr-details: true
          group-by-label: true

      - name: Upload Release Notes Artifact
        uses: actions/upload-artifact@v4
        with:
          name: release-notes
          path: RELEASE_NOTES.md

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: RELEASE_NOTES.md
          body_path: RELEASE_NOTES.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Display Stats
        run: |
          echo "PRs: ${{ steps.release_notes.outputs.pr-count }}"
          echo "Commits: ${{ steps.release_notes.outputs.commit-count }}"
```

## Inputs

| Input                    | Description                         | Required | Default            |
| ------------------------ | ----------------------------------- | -------- | ------------------ |
| `github-token`           | GitHub token for API access         | Yes      | -                  |
| `tag-name`               | Tag name for the release            | No       | Latest tag         |
| `previous-tag`           | Previous tag to compare against     | No       | Auto-detected      |
| `output-file`            | Path to write the release notes     | No       | `release-notes.md` |
| `include-commit-details` | Include detailed commit information | No       | `true`             |
| `include-pr-details`     | Include pull request information    | No       | `true`             |
| `group-by-label`         | Group PRs by labels                 | No       | `true`             |

## Outputs

| Output               | Description                                |
| -------------------- | ------------------------------------------ |
| `release-notes`      | Generated release notes in markdown format |
| `release-notes-file` | Path to the generated release notes file   |
| `pr-count`           | Number of pull requests included           |
| `commit-count`       | Number of commits included                 |

## Label Grouping

When `group-by-label` is enabled, PRs are automatically organized into sections based on their labels:

- 💥 **Breaking Changes** - `breaking`, `breaking-change`
- ✨ **Features** - `feature`
- 🚀 **Enhancements** - `enhancement`
- 🐛 **Bug Fixes** - `bug`, `bugfix`, `fix`
- 🔒 **Security** - `security`
- ⚡ **Performance** - `performance`, `perf`
- 📚 **Documentation** - `documentation`, `docs`
- 📦 **Dependencies** - `dependencies`, `deps`
- 🔧 **Other Changes** - All other PRs

### Recommended Labels

For best results, use these labels on your pull requests:

```yaml
# .github/labels.yml
- name: feature
  color: "0052CC"
  description: New feature or functionality

- name: bug
  color: "d73a4a"
  description: Bug fix

- name: enhancement
  color: "a2eeef"
  description: Enhancement or improvement

- name: documentation
  color: "0075ca"
  description: Documentation changes

- name: dependencies
  color: "0366d6"
  description: Dependency updates

- name: breaking
  color: "B60205"
  description: Breaking change

- name: security
  color: "ee0701"
  description: Security fix
```

## Example Output

```markdown
# 📋 Release Notes – v1.2.0

## 📦 Overview

**Release**: v1.2.0
**Previous Release**: v1.1.0
**Date**: 2026-01-30
**Repository**: [your-org/your-repo](https://github.com/your-org/your-repo)

## 📊 Summary

- **Pull Requests**: 15
- **Commits**: 32
- **Contributors**: 5

## ✨ Features

- **[#123](https://github.com/your-org/your-repo/pull/123)** Add dark mode support by @alice
- **[#120](https://github.com/your-org/your-repo/pull/120)** Implement user preferences by @bob

## 🐛 Bug Fixes

- **[#125](https://github.com/your-org/your-repo/pull/125)** Fix login redirect issue by @carol
- **[#122](https://github.com/your-org/your-repo/pull/122)** Resolve memory leak in worker by @dave

## 📚 Documentation

- **[#124](https://github.com/your-org/your-repo/pull/124)** Update API documentation by @alice

## 👥 Contributors

Thank you to all contributors:

- @alice
- @bob
- @carol
- @dave
- @eve

---

_Release notes generated by [DeployBrief](https://deploybrief.com) on 2026-01-30T14:30:00.000Z_
```

## Best Practices

1. **Fetch All History**: Use `fetch-depth: 0` in checkout to ensure tag comparison works correctly
2. **Label Your PRs**: Apply consistent labels to PRs for better categorization
3. **Semantic Versioning**: Use tags that follow semver (v1.2.3) for clear version tracking
4. **Automated Releases**: Trigger on tag push for fully automated release creation
5. **Review Before Publishing**: Use `draft: true` to review generated notes before publishing

## Troubleshooting

### No Tags Found

**Problem**: Action fails with "No tags found in repository"

**Solution**: Ensure you've created at least one tag and used `fetch-depth: 0` in checkout

### Missing Pull Requests

**Problem**: Some PRs aren't showing up in release notes

**Solution**: Ensure PRs are merged (not just closed) and commits are included in the tag range

### API Rate Limiting

**Problem**: Action fails due to GitHub API rate limits

**Solution**: The action uses `secrets.GITHUB_TOKEN` which has higher rate limits than unauthenticated requests

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📧 Email: support@deploybrief.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/deploybrief-release-notes-action/issues)
- 📖 Docs: [deploybrief.com/docs](https://deploybrief.com/docs)

---

**Made with ❤️ by [DeployBrief](https://deploybrief.com)**
