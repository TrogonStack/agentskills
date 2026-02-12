---
name: gh-enrich-pr-description
description: Enrich GitHub PR descriptions with root-cause context, related issues/PRs, and CC mentions. Use when creating or editing a PR, when a PR has an empty or sparse description, or when the user asks to improve a PR description.
---

# Enrich PR Description

Analyze branch changes and git history to build a rich PR description with three sections: a contextual summary, related issues/PRs, and people to CC.

## When to Use

- User asks to create a PR (before `gh pr create`)
- User asks to improve/fix a PR description
- A PR has an empty or sparse body
- User asks who to CC or what to reference

## Workflow

### 1. Gather Context

Run these in parallel to understand the full picture:

```bash
# Current branch and diff against base
git log --oneline main..HEAD
git diff main...HEAD

# PR if it already exists
gh pr view --json number,title,body,url,baseRefName,headRefName 2>/dev/null
```

### 2. Investigate the "Why"

For each changed file, dig into the history to understand the origin of the problem:

```bash
# Blame the changed lines on the base branch to find who introduced them
git blame main -- <file> | sed -n '<start>,<end>p'

# Show the originating commit
git log -1 --format='%H %an <%ae> %s' <commit-sha>

# Find the PR that introduced the commit
gh pr list --search "<commit-sha-prefix> OR <ticket-id>" --state merged --json number,title,author,url
```

Key questions to answer:
- What is the root cause of the problem?
- Is this a permanent vs transient condition being mishandled?
- What contract or convention was violated?
- Is there a sibling/similar function that handles the same case correctly?

### 3. Find Related Issues and PRs

Search for related work using ticket IDs, keywords, and function names:

```bash
# By ticket ID from branch name or commit messages
gh pr list --search "<TICKET-ID>" --state all --json number,title,author,url,state

# By keywords from the change
gh pr list --search "<keyword>" --state all --limit 10 --json number,title,author,url,state
```

Classify each related PR/issue:
- **Origin** -- introduced the code being fixed
- **Related** -- touches the same area or feature
- **Alternate** -- different approach to the same problem
- **Blocked by / Blocks** -- dependency relationship

### 4. Identify People to CC

From git blame and related PRs, collect GitHub usernames of people who:
- Authored the code being changed (from `git blame`)
- Authored related open PRs in the same area
- Are reviewers on related PRs

Extract GitHub usernames from PR data:

```bash
gh pr view <number> --json author --jq '.author.login'
```

### 5. Compose the Description

Use this structure:

```markdown
## Summary

[2-4 sentences explaining WHAT changed and WHY. Focus on the root cause
and why the previous behavior was wrong. Include the mechanism of failure.]

> [!NOTE]
> [Optional callout for additional context, such as a sibling function
> that handles the same case correctly, or a related convention.]

## Related

- #<number> -- <relationship>: <brief description>
- #<number> -- <relationship>: <brief description>

CC @<username> @<username>
```

### 6. Apply the Description

For an existing PR:

```bash
gh pr edit <number> --body "$(cat <<'EOF'
<composed description>
EOF
)"
```

For a new PR, pass it to `gh pr create --body`.

## Quality Checks

- [ ] Summary explains the root cause, not just the symptom
- [ ] Summary describes the mechanism (how the bug manifests)
- [ ] Related PRs include the one that introduced the issue
- [ ] Each related PR has a relationship label (origin, related, alternate)
- [ ] CC list includes the author of the originating code
- [ ] No speculative CC -- only people with direct involvement
