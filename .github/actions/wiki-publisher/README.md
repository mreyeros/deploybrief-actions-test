# DeployBrief Wiki Publisher - GitHub Action

Publish documentation and release notes to your GitHub Wiki automatically from GitHub Actions workflows.

## Features

- 📚 **Automatic Publishing** - Publish markdown files to GitHub Wiki from workflows
- 🔄 **Smart Updates** - Skip updates if content hasn't changed
- 🎯 **Variable Support** - Use workflow variables in wiki page names
- 📝 **Git History** - Maintains proper git commit history in wiki
- ⚙️ **Configurable** - Control commit messages, user info, and behavior

## Usage

### Basic Example

```yaml
name: Publish Documentation
on:
  push:
    branches: [main]
    paths:
      - "docs/**"

jobs:
  publish-wiki:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - name: Publish to Wiki
        uses: your-org/deploybrief-wiki-publisher-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          source-file: "docs/README.md"
          wiki-page: "Home"
          commit-message: "Update documentation from main branch"
```

### Publish Release Notes

```yaml
name: Publish Release Notes to Wiki
on:
  release:
    types: [published]

jobs:
  publish-release-notes:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - name: Generate Release Notes
        id: notes
        uses: your-org/deploybrief-release-notes-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Publish to Wiki
        uses: your-org/deploybrief-wiki-publisher-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          source-file: ${{ steps.notes.outputs.release-notes-file }}
          wiki-page: "Release-Notes/Release-${{ github.ref_name }}"
          commit-message: "Add release notes for ${{ github.ref_name }}"
```

### Dynamic Wiki Pages

```yaml
- name: Publish Versioned Documentation
  uses: your-org/deploybrief-wiki-publisher-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    source-file: "docs/changelog.md"
    wiki-page: "Changelog/${{ github.run_number }}"
    commit-message: "Update changelog from build ${{ github.run_number }}"
```

## Inputs

| Input                | Description                            | Required | Default                                        |
| -------------------- | -------------------------------------- | -------- | ---------------------------------------------- |
| `github-token`       | GitHub token for Wiki access           | Yes      | -                                              |
| `source-file`        | Path to the markdown file to publish   | Yes      | -                                              |
| `wiki-page`          | Wiki page name (without .md extension) | Yes      | `Home`                                         |
| `commit-message`     | Git commit message for the wiki update | No       | `Update wiki from workflow`                    |
| `skip-if-no-changes` | Skip update if content hasn't changed  | No       | `true`                                         |
| `git-user-name`      | Git user name for commits              | No       | `github-actions[bot]`                          |
| `git-user-email`     | Git user email for commits             | No       | `github-actions[bot]@users.noreply.github.com` |

## Outputs

| Output           | Description                                |
| ---------------- | ------------------------------------------ |
| `wiki-url`       | URL to the published wiki page             |
| `wiki-page-path` | Path to the wiki page that was updated     |
| `changes-made`   | Whether changes were made (`true`/`false`) |

## Wiki Page Naming

The `wiki-page` input supports:

- **Simple names**: `Home`, `Documentation`, `API-Reference`
- **Nested pages**: `Docs/Getting-Started`, `Release-Notes/v1.0.0`
- **Variables**: `Release-${{ github.ref_name }}`, `Build-${{ github.run_number }}`

### Examples

```yaml
# Single page (overwrites)
wiki-page: 'Release-Notes'

# Versioned by release tag
wiki-page: 'Release-Notes/${{ github.ref_name }}'

# Versioned by build number
wiki-page: 'Changelog/Build-${{ github.run_number }}'

# Organized by date
wiki-page: 'Updates/${{ steps.date.outputs.date }}'

# Environment-specific
wiki-page: 'Deployments/${{ inputs.environment }}'
```

## Prerequisites

### Enable Wiki

1. Go to your repository on GitHub
2. Click **Settings** → **General**
3. Under **Features**, enable **Wikis**

### Initialize Wiki

The wiki must be initialized before the action can publish to it:

1. Go to the **Wiki** tab in your repository
2. Click **Create the first page**
3. Add some content and save

Alternatively, clone and initialize the wiki manually:

```bash
git clone https://github.com/your-org/your-repo.wiki.git
cd your-repo.wiki
echo "# Wiki" > Home.md
git add Home.md
git commit -m "Initialize wiki"
git push origin master
```

### Permissions

The workflow needs `contents: write` permission:

```yaml
permissions:
  contents: write
```

## Complete Example

```yaml
name: Documentation Pipeline
on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  publish-docs:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Publish Main Documentation
        uses: your-org/deploybrief-wiki-publisher-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          source-file: "docs/README.md"
          wiki-page: "Home"
          commit-message: "Update home page from ${{ github.sha }}"

      - name: Publish API Documentation
        uses: your-org/deploybrief-wiki-publisher-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          source-file: "docs/API.md"
          wiki-page: "API-Reference"

  publish-release-notes:
    if: github.event_name == 'release'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: read

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate Release Notes
        id: notes
        uses: your-org/deploybrief-release-notes-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Publish Release Notes
        uses: your-org/deploybrief-wiki-publisher-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          source-file: ${{ steps.notes.outputs.release-notes-file }}
          wiki-page: "Release-Notes/${{ github.ref_name }}"
          commit-message: "Add release notes for ${{ github.ref_name }} [skip ci]"

      - name: Update Release Notes Index
        uses: your-org/deploybrief-wiki-publisher-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          source-file: "docs/release-notes-index.md"
          wiki-page: "Release-Notes"
          commit-message: "Update release notes index"
```

## Best Practices

1. **Use Descriptive Commit Messages**: Include context about what's being updated
2. **Skip Unchanged Content**: Keep `skip-if-no-changes: true` to avoid empty commits
3. **Organize with Folders**: Use forward slashes in page names for hierarchy
4. **Link from Home**: Maintain a Home page with links to all documentation
5. **Version Your Docs**: Use variables to create versioned documentation pages

## Troubleshooting

### Wiki Not Initialized

**Problem**: Action fails with "Repository not found" or "remote: Not Found"

**Solution**: Initialize the wiki by creating at least one page through the GitHub UI

### Permission Denied

**Problem**: Action fails with permission errors

**Solution**: Add `contents: write` permission to your workflow:

```yaml
permissions:
  contents: write
```

### Content Not Updating

**Problem**: Wiki page isn't updating with new content

**Solution**: Check if `skip-if-no-changes` is set to `true`. Temporarily set it to `false` to force an update.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📧 Email: support@deploybrief.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/deploybrief-wiki-publisher-action/issues)
- 📖 Docs: [deploybrief.com/docs](https://deploybrief.com/docs)

---

**Made with ❤️ by [DeployBrief](https://deploybrief.com)**
