#!/usr/bin/env node

import { readFile } from "node:fs/promises";

const usage = `Usage:
  node validate-subjects.mjs --subject <subject> [--kind publish|subscribe|stream|consumer|deliver]
  node validate-subjects.mjs --file <path>

A file contains one entry per line: <kind> <subject>.
Blank lines and lines beginning with # are ignored.`;

const kinds = new Set(["publish", "subscribe", "stream", "consumer", "deliver"]);

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

const args = process.argv.slice(2);
let file;
let subject;
let kind = "subscribe";
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--file") {
    file = args[++index];
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

if (!file && !subject) {
  console.error(usage);
  process.exit(1);
}

if (subject) {
  validate(subject, kind, "command line");
} else {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf(" ");
    if (separator < 1) {
      fail(`${file}:${index + 1}: expected '<kind> <subject>'`);
      continue;
    }
    const lineKind = trimmed.slice(0, separator);
    const lineSubject = trimmed.slice(separator + 1).trim();
    validate(lineSubject, lineKind, `${file}:${index + 1}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log("subjects valid");
