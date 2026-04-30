---
name: scaffold-plugin
description: >-
  Scaffold a new plugin in this repository with all required wiring.
  Use when creating a new plugin from scratch. Do not use for adding skills to
  an existing plugin or for modifying plugin metadata.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Scaffold a New Plugin

Create a new plugin with all the required files and registry wiring so it is ready for skills to be added.

## When to Use

- Creating a brand new plugin in this repository
- User asks to "scaffold", "create", or "set up" a new plugin

## When NOT to Use

- Adding skills to an existing plugin (just create the skill directory and SKILL.md)
- Modifying an existing plugin's metadata (edit plugin.json directly)
- Renaming or moving a plugin

## Workflow

### 1. Gather Plugin Information

Ask the user for the plugin name if not already provided. The name must:
- Use kebab-case
- Be prefixed with `trogonstack-`
- Be concise and descriptive

Ask for a one-line description if not already provided.

### 2. Create Plugin Directory Structure

```
plugins/{plugin-name}/
├── .claude-plugin/
│   └── plugin.json
├── skills/           (empty, ready for skills)
└── README.md
```

Do NOT create a CHANGELOG.md — release-please manages that automatically.

### 3. Create plugin.json

```json
{
  "name": "{plugin-name}",
  "description": "{description}",
  "version": "0.0.1",
  "author": {
    "name": "TrogonStack",
    "url": "https://github.com/TrogonStack"
  }
}
```

### 4. Create README.md

````markdown
# {plugin-name}

{description}

```bash
claude plugin install {plugin-name}@trogonstack
```
````

### 5. Register in Marketplace

Add an entry to `.claude-plugin/marketplace.json` in the `plugins` array:

```json
{
  "name": "{plugin-name}",
  "description": "{description}",
  "source": "./plugins/{plugin-name}",
  "category": "development"
}
```

### 6. Register in Release Please Config

Add the package to `.github/release-please-config.json` in the `packages` object:

```json
"plugins/{plugin-name}": {
  "component": "{plugin-name}"
}
```

### 7. Register in Release Please Manifest

Add the initial version to `.github/release-please-manifest.json`:

```json
"plugins/{plugin-name}": "0.0.1"
```

It must be `0.0.1`.

### 8. Commit

Use conventional commit format:

```
feat({plugin-name}): scaffold plugin for {short purpose}
```

## Quality Checklist

- [ ] Plugin directory exists at `plugins/{plugin-name}/`
- [ ] `plugins/{plugin-name}/.claude-plugin/plugin.json` exists with correct name, description, version `0.0.1`, and author
- [ ] `plugins/{plugin-name}/README.md` exists with install command
- [ ] `plugins/{plugin-name}/skills/` directory exists (empty)
- [ ] No CHANGELOG.md was created
- [ ] `.claude-plugin/marketplace.json` has the new plugin entry
- [ ] `.github/release-please-config.json` has the new package
- [ ] `.github/release-please-manifest.json` has the new version entry at `0.0.1`
- [ ] Description is consistent across plugin.json, marketplace.json, and README.md
