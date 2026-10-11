#!/usr/bin/env node
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = join(repoRoot, "plugins");
const marketplacePath = join(repoRoot, ".claude-plugin", "marketplace.json");
const cursorMarketplacePath = join(repoRoot, ".cursor-plugin", "marketplace.json");
const cursorSchemasDir = join(repoRoot, "schemas", "cursor-plugin");
const agentPluginsSchemaPath = join(repoRoot, "schemas", "agent-plugins", "1.0.0", "plugin.schema.json");
const configPath = join(repoRoot, ".github", "release-please-config.json");
const manifestPath = join(repoRoot, ".github", "release-please-manifest.json");

const errors = [];
const fail = (msg) => errors.push(msg);

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`failed to read ${path}: ${err.message}`);
    return null;
  }
};

const semverRe = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const marketplace = readJson(marketplacePath);
const cursorMarketplace = readJson(cursorMarketplacePath);
const config = readJson(configPath);
const manifest = readJson(manifestPath);

const marketplaceByName = new Map(
  (marketplace?.plugins ?? []).map((p) => [p.name, p])
);
const cursorMarketplaceByName = new Map(
  (cursorMarketplace?.plugins ?? []).map((p) => [p.name, p])
);
const configPackages = config?.packages ?? {};
const manifestPackages = manifest ?? {};

const pluginDirs = readdirSync(pluginsDir).filter((entry) => {
  const full = join(pluginsDir, entry);
  return statSync(full).isDirectory();
});

const expectedPath = (name) => `plugins/${name}`;

let Ajv, Ajv2020, addFormats;
try {
  ({ default: Ajv } = await import("ajv"));
  ({ default: Ajv2020 } = await import("ajv/dist/2020.js"));
  ({ default: addFormats } = await import("ajv-formats"));
} catch {
  console.error("Missing dependencies: run `npm install --no-save ajv@8 ajv-formats@3` first.");
  process.exit(1);
}
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateCursorPlugin = ajv.compile(
  readJson(join(cursorSchemasDir, "plugin.schema.json"))
);
const validateCursorMarketplace = ajv.compile(
  readJson(join(cursorSchemasDir, "marketplace.schema.json"))
);
const ajv2020 = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv2020);
const validateAgentPlugin = ajv2020.compile(readJson(agentPluginsSchemaPath));
const schemaErrors = (validate) =>
  (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message}`).join("; ");

if (cursorMarketplace && !validateCursorMarketplace(cursorMarketplace)) {
  fail(`.cursor-plugin/marketplace.json: ${schemaErrors(validateCursorMarketplace)}`);
}
if (marketplace && cursorMarketplace && marketplace.name !== cursorMarketplace.name) {
  fail(
    `.cursor-plugin/marketplace.json name "${cursorMarketplace.name}" does not match .claude-plugin/marketplace.json name "${marketplace.name}"`
  );
}

const extraFilePaths = new Set((config?.["extra-files"] ?? []).map((f) => f.path));
for (const path of [".claude-plugin/plugin.json", ".cursor-plugin/plugin.json", "plugin.json"]) {
  if (!extraFilePaths.has(path)) {
    fail(`release-please-config.json extra-files is missing "${path}", its version would drift on release`);
  }
}

for (const name of pluginDirs) {
  const pluginJsonPath = join(pluginsDir, name, ".claude-plugin", "plugin.json");
  if (!existsSync(pluginJsonPath)) {
    fail(`plugins/${name}: missing .claude-plugin/plugin.json`);
    continue;
  }

  const pluginJson = readJson(pluginJsonPath);
  if (!pluginJson) continue;

  if (pluginJson.name !== name) {
    fail(
      `plugins/${name}: plugin.json name "${pluginJson.name}" does not match directory`
    );
  }

  if (!pluginJson.version || !semverRe.test(pluginJson.version)) {
    fail(`plugins/${name}: plugin.json version "${pluginJson.version}" is not valid semver`);
  }

  const mp = marketplaceByName.get(name);
  if (!mp) {
    fail(`plugins/${name}: not listed in .claude-plugin/marketplace.json`);
  } else if (mp.source !== `./plugins/${name}`) {
    fail(
      `plugins/${name}: marketplace.json source "${mp.source}" should be "./plugins/${name}"`
    );
  }

  const cursorPluginJsonPath = join(pluginsDir, name, ".cursor-plugin", "plugin.json");
  if (!existsSync(cursorPluginJsonPath)) {
    fail(`plugins/${name}: missing .cursor-plugin/plugin.json`);
  } else {
    const cursorPluginJson = readJson(cursorPluginJsonPath);
    if (cursorPluginJson) {
      if (!validateCursorPlugin(cursorPluginJson)) {
        fail(`plugins/${name}/.cursor-plugin/plugin.json: ${schemaErrors(validateCursorPlugin)}`);
      }
      for (const field of ["name", "version", "description"]) {
        if (cursorPluginJson[field] !== pluginJson[field]) {
          fail(
            `plugins/${name}: .cursor-plugin/plugin.json ${field} "${cursorPluginJson[field]}" does not match .claude-plugin/plugin.json ${field} "${pluginJson[field]}"`
          );
        }
      }
      const skillPaths = [cursorPluginJson.skills ?? []].flat();
      if (skillPaths.length === 0) {
        fail(`plugins/${name}: .cursor-plugin/plugin.json does not declare "skills"`);
      }
      for (const skillPath of skillPaths) {
        if (!existsSync(join(pluginsDir, name, skillPath))) {
          fail(`plugins/${name}: .cursor-plugin/plugin.json skills path "${skillPath}" does not exist`);
        }
      }
    }
  }

  const agentPluginJsonPath = join(pluginsDir, name, "plugin.json");
  if (!existsSync(agentPluginJsonPath)) {
    fail(`plugins/${name}: missing plugin.json (Agent Plugins manifest)`);
  } else {
    const agentPluginJson = readJson(agentPluginJsonPath);
    if (agentPluginJson) {
      if (!validateAgentPlugin(agentPluginJson)) {
        fail(`plugins/${name}/plugin.json: ${schemaErrors(validateAgentPlugin)}`);
      }
      for (const field of ["name", "version", "description"]) {
        if (agentPluginJson[field] !== pluginJson[field]) {
          fail(
            `plugins/${name}: plugin.json ${field} "${agentPluginJson[field]}" does not match .claude-plugin/plugin.json ${field} "${pluginJson[field]}"`
          );
        }
      }
    }
  }
  if (!existsSync(join(pluginsDir, name, "skills"))) {
    fail(`plugins/${name}: missing skills/ directory, the fixed Agent Plugins skills location`);
  }

  const cmp = cursorMarketplaceByName.get(name);
  if (!cmp) {
    fail(`plugins/${name}: not listed in .cursor-plugin/marketplace.json`);
  } else {
    if (cmp.source !== `plugins/${name}`) {
      fail(
        `plugins/${name}: .cursor-plugin/marketplace.json source "${cmp.source}" should be "plugins/${name}"`
      );
    }
    if (mp && cmp.description !== mp.description) {
      fail(
        `plugins/${name}: .cursor-plugin/marketplace.json description does not match .claude-plugin/marketplace.json`
      );
    }
  }

  const key = expectedPath(name);
  if (!configPackages[key]) {
    fail(`plugins/${name}: missing entry "${key}" in release-please-config.json packages`);
  } else if (configPackages[key].component !== name) {
    fail(
      `plugins/${name}: release-please-config.json component "${configPackages[key].component}" should be "${name}"`
    );
  }

  if (!(key in manifestPackages)) {
    fail(`plugins/${name}: missing entry "${key}" in release-please-manifest.json`);
  } else if (manifestPackages[key] !== pluginJson.version) {
    fail(
      `plugins/${name}: manifest version "${manifestPackages[key]}" does not match plugin.json version "${pluginJson.version}"`
    );
  }
}

const pluginSet = new Set(pluginDirs);

for (const mp of marketplace?.plugins ?? []) {
  if (!pluginSet.has(mp.name)) {
    fail(`marketplace.json references "${mp.name}" but plugins/${mp.name} does not exist`);
  }
}

for (const cmp of cursorMarketplace?.plugins ?? []) {
  if (!pluginSet.has(cmp.name)) {
    fail(`.cursor-plugin/marketplace.json references "${cmp.name}" but plugins/${cmp.name} does not exist`);
  }
}

for (const key of Object.keys(configPackages)) {
  const name = key.replace(/^plugins\//, "");
  if (!pluginSet.has(name)) {
    fail(`release-please-config.json references "${key}" but ${key} does not exist`);
  }
}

for (const key of Object.keys(manifestPackages)) {
  const name = key.replace(/^plugins\//, "");
  if (!pluginSet.has(name)) {
    fail(`release-please-manifest.json references "${key}" but ${key} does not exist`);
  }
}

if (errors.length > 0) {
  console.error(`Plugin registration validation failed with ${errors.length} error(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`Validated ${pluginDirs.length} plugin(s). All registrations look good.`);
