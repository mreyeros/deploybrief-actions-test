# DeployBrief Evidence Gate - GitHub Action

Validate pull request evidence and requirements before allowing merges. Enforce quality standards, required approvals, labels, and documentation.

## Features

- 🏷️ **Label Requirements** - Require specific labels before merging
- 🚫 **Blocked Labels** - Prevent merges with WIP or do-not-merge labels
- ✅ **Approval Requirements** - Enforce minimum reviewer approvals
- 📝 **Description Validation** - Require non-empty PR descriptions
- 🔗 **Issue Linking** - Ensure PRs are linked to issues
- 🧪 **Test Validation** - Verify tests are passing
- 💬 **PR Comments** - Automatic feedback on validation status
- ⚙️ **Flexible Configuration** - Customize rules for your workflow

## Usage

### Basic Example

```yaml
name: PR Validation
on:
  pull_request:
    types: [opened, edited, labeled, unlabeled, synchronize, reopened]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Validate PR Evidence
        uses: your-org/deploybrief-evidence-gate-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          require-labels: "reviewed,tested"
          require-approvals: 1
          require-description: true
          blocked-labels: "wip,do-not-merge"
```

### Comprehensive Validation

```yaml
name: Comprehensive PR Validation
on:
  pull_request:
    types:
      [
        opened,
        edited,
        labeled,
        unlabeled,
        synchronize,
        reopened,
        review_requested,
        review_request_removed,
      ]
  pull_request_review:
    types: [submitted, dismissed]

jobs:
  evidence-gate:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Evidence Gate
        uses: your-org/deploybrief-evidence-gate-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          require-labels: "reviewed,tested,documented"
          require-approvals: 2
          require-linked-issue: true
          require-description: true
          require-tests: true
          blocked-labels: "wip,do-not-merge,work-in-progress,needs-discussion"
          fail-on-violation: true
```

### Branch Protection Integration

```yaml
name: Required PR Checks
on:
  pull_request:
    branches: [main, production]

jobs:
  evidence-gate:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Validate PR
        uses: your-org/deploybrief-evidence-gate-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          require-approvals: 2
          require-linked-issue: true
          blocked-labels: "wip,do-not-merge"

      # This check will be required in branch protection rules
      - name: Gate Status
        if: failure()
        run: echo "PR does not meet evidence requirements"
```

## Inputs

| Input                  | Description                      | Required | Default                             |
| ---------------------- | -------------------------------- | -------- | ----------------------------------- |
| `github-token`         | GitHub token for API access      | Yes      | -                                   |
| `require-labels`       | Comma-separated required labels  | No       | `''`                                |
| `require-approvals`    | Minimum approving reviews        | No       | `0`                                 |
| `require-linked-issue` | Require PR to link to an issue   | No       | `false`                             |
| `require-description`  | Require non-empty PR description | No       | `true`                              |
| `require-tests`        | Require passing tests            | No       | `false`                             |
| `blocked-labels`       | Labels that block merging        | No       | `wip,do-not-merge,work-in-progress` |
| `fail-on-violation`    | Fail check if validation fails   | No       | `true`                              |

## Outputs

| Output              | Description                        |
| ------------------- | ---------------------------------- |
| `validation-result` | Overall result (`passed`/`failed`) |
| `violations`        | List of violations in JSON format  |
| `violation-count`   | Number of violations found         |

## Validation Rules

### 1. Required Labels

Ensure PRs have specific labels before merging:

```yaml
require-labels: "feature,reviewed,tested"
```

**Use Cases:**

- Ensure code has been reviewed
- Verify tests have been run
- Confirm documentation is updated
- Track feature types

### 2. Blocked Labels

Prevent merges when certain labels are present:

```yaml
blocked-labels: "wip,do-not-merge,needs-discussion"
```

**Use Cases:**

- Block work-in-progress PRs
- Prevent accidental merges
- Require resolution of discussions

### 3. Approval Requirements

Enforce minimum reviewer approvals:

```yaml
require-approvals: 2
```

**Use Cases:**

- Critical production branches
- Security-sensitive changes
- Regulatory compliance

### 4. Description Validation

Require PR descriptions:

```yaml
require-description: true
```

**Use Cases:**

- Ensure context is provided
- Improve code review quality
- Maintain changelog information

### 5. Linked Issues

Ensure PRs reference issues:

```yaml
require-linked-issue: true
```

Supports these patterns in PR description:

- `fixes #123`
- `closes #456`
- `resolves #789`
- `#123`

**Use Cases:**

- Track work item completion
- Maintain traceability
- Automate issue closure

### 6. Test Requirements

Verify tests are passing:

```yaml
require-tests: true
```

**Use Cases:**

- Enforce quality standards
- Prevent breaking changes
- Maintain CI/CD reliability

## PR Comment Feedback

The action automatically posts comments on PRs with validation results:

### Passing Validation

```markdown
## 🛡️ Evidence Gate Validation

### ✅ All Checks Passed

This pull request meets all required evidence and quality standards.
```

### Failing Validation

```markdown
## 🛡️ Evidence Gate Validation

### ❌ Validation Failed

Found 3 violation(s) that must be resolved:

#### ❌ Errors

- **require-labels**: Missing required labels: reviewed, tested
- **require-approvals**: Insufficient approvals: 0/2
- **blocked-labels**: PR has blocking labels: wip

Please resolve these issues before merging.
```

## Branch Protection Setup

To enforce Evidence Gate in branch protection:

1. Go to **Settings** → **Branches**
2. Add branch protection rule
3. Enable **Require status checks to pass before merging**
4. Search for and select the Evidence Gate workflow
5. Save protection rule

Now PRs cannot be merged until Evidence Gate passes.

## Complete Example Workflow

```yaml
name: Pull Request Quality Gate
on:
  pull_request:
    types: [opened, edited, labeled, unlabeled, synchronize, reopened]
  pull_request_review:
    types: [submitted]

jobs:
  evidence-gate:
    name: Validate PR Evidence
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      checks: read

    steps:
      - name: Check PR Evidence
        id: gate
        uses: your-org/deploybrief-evidence-gate-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          require-labels: "reviewed"
          require-approvals: 1
          require-description: true
          require-linked-issue: true
          blocked-labels: "wip,do-not-merge"
          fail-on-violation: true

      - name: Summary
        if: always()
        run: |
          echo "Validation Result: ${{ steps.gate.outputs.validation-result }}"
          echo "Violations: ${{ steps.gate.outputs.violation-count }}"
```

## Best Practices

1. **Start Simple**: Begin with basic rules and add more as needed
2. **Clear Labels**: Use consistent, well-documented labels across your org
3. **Appropriate Approvals**: Match approval requirements to branch criticality
4. **Test on Drafts**: Exclude draft PRs if you want looser validation
5. **Informative Feedback**: Use labels and descriptions to provide context

## Troubleshooting

### Check Always Fails

**Problem**: Evidence gate always fails even when requirements are met

**Solution**: Verify label names match exactly (case-sensitive) and check permissions

### Comments Not Posted

**Problem**: Action doesn't post comments on PRs

**Solution**: Add `pull-requests: write` permission to workflow:

```yaml
permissions:
  pull-requests: write
```

### Approvals Not Detected

**Problem**: Reviews aren't being counted as approvals

**Solution**: Ensure reviewers have "Approve" permission and are actually approving (not just commenting)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📧 Email: support@deploybrief.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/deploybrief-evidence-gate-action/issues)
- 📖 Docs: [deploybrief.com/docs](https://deploybrief.com/docs)

---

**Made with ❤️ by [DeployBrief](https://deploybrief.com)**
