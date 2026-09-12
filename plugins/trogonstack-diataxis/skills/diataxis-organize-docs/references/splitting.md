# Split Mixed Documents

When a document contains multiple types:

1. **Identify boundaries.** Mark where content shifts purpose.
1. **Extract sections.** Move each type to its proper location.
1. **Add cross-references.** Link related content across quadrants and update links to moved sections.
1. **Preserve context.** Ensure each piece stands alone and all original content is accounted for.

## Example Split

**Before (mixed document):**

```markdown
# Authentication

Authentication uses JWT tokens. (explanation)

## Quick Start

1. Install the package... (tutorial)

## API Reference

- `authenticate(user, pass)` - Returns token (reference)

## Troubleshooting

### Token Expired

If you see error X, do Y... (how-to)
```

**After (paths relative to `docs/`):**

```text
tutorial/authentication/quickstart.md
how-to/troubleshooting/token-expired.md
reference/api/authentication.md
explanation/concepts/authentication.md
```

Link the quickstart to the authentication reference and explanation. Link the troubleshooting guide to the token details in the reference, so readers can find related information without duplicating it.
