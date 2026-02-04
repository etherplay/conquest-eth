---
name: github-mcp
description: Use GitHub MCP server to interact with GitHub repositories, issues, PRs, and actions. Use when I need to: (1) create/manage GitHub issues, (2) search repositories or code, (3) manage or review pull requests, (4) trigger GitHub Actions workflows, (5) read file contents from GitHub repos.
---

# GitHub MCP Server

This skill teaches how to use the GitHub MCP server via mcporter to interact with GitHub repositories.

## Quick Commands

List available tools:

```bash
mcporter list github --schema
```

Call a tool:

```bash
mcporter call github.list_issues owner=ronan repo=conquest.game state=open limit:5
```

## Common Commands

### Repository Operations

```bash
# Get repository info
mcporter call github.get_repo owner=ronan repo=conquest.game

# List repositories (for an owner)
mcporter call github.list_repos owner=ronan

# Search repositories
mcporter call github.search_repos query="game engine language:typescript" limit:10
```

### Issues

```bash
# List issues
mcporter call github.list_issues owner=ronan repo=conquest.game state=open

# Get specific issue
mcporter call github.get_issue owner=ronan repo=conquest.game issue_number=42

# Create issue
mcporter call github.create_issue owner=ronan repo=conquest.game --args '{"title": "Bug in movement system", "body": "Describe the bug...", "labels": ["bug"]}'

# Update issue
mcporter call github.update_issue owner=ronan repo=conquest.game issue_number=42 --args '{"state": "closed"}'
```

### Pull Requests

```bash
# List PRs
mcporter call github.list_prs owner=ronan repo=conquest.game state=open

# Get PR details
mcporter call github.get_pr owner=ronan repo=conquest.game pr_number=15

# Create PR
mcporter call github.create_pr owner=ronan repo=conquest.game --args '{"title": "Add new feature", "head": "feature-branch", "base": "main"}'

# Merge PR
mcporter call github.merge_pr owner=ronan repo=conquest.game pr_number=15
```

### Code & Files

```bash
# Read file from repo
mcporter call github.get_file owner=ronan repo=conquest.game path="README.md"

# Search code
mcporter call github.search_code repo=ronan/conquest.game query="function attack"
```

### Actions

```bash
# List workflows
mcporter call github.list_workflows owner=ronan repo=conquest.game

# Trigger workflow
mcporter call github.trigger_workflow owner=ronan repo=conquest.game workflow_id=deploy.yml
```

## Auth

If GitHub MCP isn't configured:

```bash
mcporter auth github
```

This opens GitHub OAuth flow to grant permissions.

## When to Use This Skill

Use GitHub MCP when you need to:

- **Automate GitHub workflows** without using the full gh CLI
- **Query GitHub data** (repos, issues, PRs, code) in a structured way
- **Create or update GitHub issues/PRs** programmatic access
- **Integrate GitHub actions** with agent workflows
- **Search code across repos** with advanced filters

## Example Workflows

### Workflow 1: Create an issue with labels

```bash
# 1. Check if repo exists
mcporter call github.get_repo owner=ronan repo=conquest.game

# 2. Create issue
mcporter call github.create_issue owner=ronan repo=conquest.game --args '{
  "title": "Fix pathfinding bug in sector 7",
  "body": "Units getting stuck near obstacles...",
  "labels": ["bug", "high-priority"]
}'
```

### Workflow 2: Review open PRs and merge if approved

```bash
# 1. List open PRs
mcporter call github.list_prs owner=ronan repo=conquest.game state=open

# 2. Get PR details (use pr_number from step 1)
mcporter call github.get_pr owner=ronan repo=conquest.game pr_number=42

# 3. Merge if checks pass
mcporter call github.merge_pr owner=ronan repo=conquest.game pr_number=42
```

### Workflow 3: Search for specific code pattern

```bash
# Search for a function across all repos
mcporter call github.search_code query="function executeAttack" owner=ronan

# Get file content if found
mcporter call github.get_file owner=ronan repo=conquest.game path="src/combat/attack.ts"
```

## Notes

- All commands use mcporter under the hood. Learn more with `mcporter --help`
- The GitHub MCP server must be configured in mcporter config first
- Use `--output json` with mcporter if you need structured output
- Most commands require `owner` and `repo` parameters
- For complex arguments, use `--args` with JSON
