# Contributing

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and [release-please](https://github.com/googleapis/release-please) for automated releases.

Use these commit prefixes:
- `feat:` - New features (bumps minor version)
- `fix:` - Bug fixes (bumps patch version)
- `chore:` - Maintenance tasks (no version bump)

**Always include the release-please component as the scope** when changing a plugin, so automated releases target the correct package. Components are defined in `.github/release-please-config.json`.

Examples:
```bash
git commit -m "feat(trogonstack-diataxis): add new skill for database migrations"
git commit -m "fix(trogonstack-gh): correct worktree path handling"
git commit -m "chore: update dependencies"
```

## Releases

Releases are automated via release-please:

1. Push commits to `main` using conventional commit messages
2. Release-please creates/updates a "Release PR" with changelog and version bump
3. Merge the Release PR to publish a new version

The version in `.claude-plugin/plugin.json` is automatically updated when a release is published.
