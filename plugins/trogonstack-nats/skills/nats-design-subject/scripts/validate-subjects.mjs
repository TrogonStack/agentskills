#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const markdownTag = "nats-subjects";
const kinds = new Set(["publish", "subscribe", "stream", "consumer", "deliver"]);
const usage = `Usage:
  node validate-subjects.mjs --subject <subject> [--kind publish|subscribe|stream|consumer|deliver]
  node validate-subjects.mjs --file <path>
  node validate-subjects.mjs --root <directory>

A YAML fixture file contains kind records with a subjects list. Legacy line fixtures remain supported.
Markdown files contain YAML-like records in fenced blocks tagged with ${markdownTag}:

\`\`\`yaml ${markdownTag}
- kind: publish
  subjects:
    - events.created
\`\`\`

Blank lines and lines beginning with # are ignored.`;

function fail(message) {
  console.error(`error: ${message}`);
  process.exitCode = 1;
}

function validate(subject, kind, location) {
  const label = location ? `${location}: ` : "";
  if (!kinds.has(kind)) {
    fail(`${label}unknown subject kind ${kind}`);
    return;
  }
  if (!subject) {
    fail(`${label}subject is empty`);
    return;
  }
  if (subject.length > 255) {
    fail(`${label}subject exceeds the recommended 255-character limit`);
  }
  if (/\s|\0/.test(subject)) {
    fail(`${label}subject contains whitespace or a NUL character`);
  }
  const tokens = subject.split(".");
  if (tokens.some((token) => token.length === 0)) {
    fail(`${label}subject contains an empty token`);
  }
  for (const [index, token] of tokens.entries()) {
    if (token.includes("*") && token !== "*") {
      fail(`${label}* must be a complete token`);
    }
    if (token.includes(">") && token !== ">") {
      fail(`${label}> must be a complete token`);
    }
    if (token === ">" && index !== tokens.length - 1) {
      fail(`${label}> must be the final token`);
    }
  }
  if ((kind === "publish" || kind === "deliver") && tokens.some((token) => token === "*" || token === ">")) {
    fail(`${label}${kind} subjects must be concrete and cannot contain wildcards`);
  }
  if (kind === "deliver" && subject.startsWith("$")) {
    fail(`${label}delivery subjects must not use a reserved server prefix`);
  }
}

function unquote(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed.at(-1);
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function parseLegacyFixture(content, file) {
  let entries = 0;
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf(" ");
    if (separator < 1) {
      fail(`${file}:${index + 1}: expected '<kind> <subject>'`);
      continue;
    }
    const kind = trimmed.slice(0, separator);
    const subject = trimmed.slice(separator + 1).trim();
    validate(subject, kind, `${file}:${index + 1}`);
    entries += 1;
  }
  return entries;
}

function parseTaggedBlock(lines, file, openingLine) {
  let currentKind;
  let awaitingSubjects = false;
  let readingSubjects = false;
  let entries = 0;

  for (const [index, line] of lines.entries()) {
    const location = `${file}:${openingLine + index + 1}`;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const kindMatch = trimmed.match(/^(?:-\s*)?kind:\s*([A-Za-z-]+)\s*$/);
    if (kindMatch) {
      if (awaitingSubjects) {
        fail(`${location}: previous kind has no subjects`);
      }
      currentKind = kindMatch[1];
      awaitingSubjects = true;
      readingSubjects = false;
      continue;
    }

    if (trimmed === "subjects:") {
      if (!currentKind) {
        fail(`${location}: subjects must follow a kind`);
      } else {
        readingSubjects = true;
      }
      continue;
    }

    const subjectMatch = trimmed.match(/^[-]\s+(.+)$/);
    if (subjectMatch && readingSubjects) {
      validate(unquote(subjectMatch[1]), currentKind, location);
      entries += 1;
      awaitingSubjects = false;
      continue;
    }

    fail(`${location}: expected 'kind: <kind>', 'subjects:', or a subject list item`);
  }

  if (awaitingSubjects) {
    fail(`${file}:${openingLine}: final kind has no subjects`);
  }
  if (entries === 0) {
    fail(`${file}:${openingLine}: tagged block has no subject entries`);
  }
  return entries;
}

function parseMarkdown(content, file) {
  const lines = content.split(/\r?\n/);
  let inFence = false;
  let fenceMarker = "";
  let info = "";
  let openingLine = 0;
  let body = [];
  let entries = 0;

  for (const [index, line] of lines.entries()) {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!inFence && fence) {
      inFence = true;
      fenceMarker = fence[1];
      info = fence[2].trim();
      openingLine = index + 1;
      body = [];
      continue;
    }
    const closing = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
    if (inFence && closing && closing[1][0] === fenceMarker[0] && closing[1].length >= fenceMarker.length) {
      if (info.split(/\s+/).includes(markdownTag)) {
        entries += parseTaggedBlock(body, file, openingLine);
      }
      inFence = false;
      fenceMarker = "";
      info = "";
      body = [];
      continue;
    }
    if (inFence) {
      body.push(line);
    }
  }

  if (inFence) {
    fail(`${file}:${openingLine}: fenced block is not closed`);
  }
  return entries;
}

async function markdownFiles(root) {
  const details = await stat(root);
  if (details.isFile()) {
    return root.endsWith(".md") ? [root] : [];
  }
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await markdownFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path);
    }
  }
  return files;
}

const args = process.argv.slice(2);
let file;
let root;
let subject;
let kind = "subscribe";
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--file") {
    file = args[++index];
  } else if (argument === "--root") {
    root = args[++index];
  } else if (argument === "--subject") {
    subject = args[++index];
  } else if (argument === "--kind") {
    kind = args[++index];
  } else if (argument === "--help" || argument === "-h") {
    console.log(usage);
    process.exit(0);
  } else {
    fail(`unknown argument ${argument}`);
    console.error(usage);
    process.exit(1);
  }
}

if (!file && !root && !subject) {
  console.error(usage);
  process.exit(1);
}

let entries = 0;
if (subject) {
  validate(subject, kind, "command line");
  entries = 1;
} else if (file) {
  const content = await readFile(file, "utf8");
  entries = file.endsWith(".md")
    ? parseMarkdown(content, file)
    : file.endsWith(".yaml") || file.endsWith(".yml")
      ? parseTaggedBlock(content.split(/\r?\n/), file, 0)
      : parseLegacyFixture(content, file);
} else {
  for (const path of await markdownFiles(root)) {
    entries += parseMarkdown(await readFile(path, "utf8"), path);
  }
}

if (entries === 0) {
  fail(`no subject entries found${root ? ` under ${root}` : ""}`);
}
if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log(`subjects valid (${entries} entr${entries === 1 ? "y" : "ies"})`);
