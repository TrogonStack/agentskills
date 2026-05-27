#!/usr/bin/env node
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDir = join(repoRoot, "plugins");
const marketplacePath = join(repoRoot, ".claude-plugin", "marketplace.json");
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
const config = readJson(configPath);
const manifest = readJson(manifestPath);

const marketplaceByName = new Map(
  (marketplace?.plugins ?? []).map((p) => [p.name, p])
);
const configPackages = config?.packages ?? {};
const manifestPackages = manifest ?? {};

const pluginDirs = readdirSync(pluginsDir).filter((entry) => {
  const full = join(pluginsDir, entry);
  return statSync(full).isDirectory();
});

const expectedPath = (name) => `plugins/${name}`;

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
