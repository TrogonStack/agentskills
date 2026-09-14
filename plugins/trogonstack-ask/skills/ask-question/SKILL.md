---
name: ask-question
description: "Ask structured questions one at a time to gather requirements, context, or clarification. Each question includes the intention behind it and current assumptions. Use when the user wants to be interviewed about a topic, gather requirements, or needs help thinking through a problem step by step."
allowed-tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
---

# Ask Question

Ask me one question at a time. For each question, use this exact format:

**Question:** [your question]
**Intention:** [why you are asking this]
**Assumptions:**
- [assumption based on previous information]
- [another assumption, if any]

Wait for my answer before asking the next question.

## Adaptive questioning

Do NOT pre-plan a fixed number of questions from the initial prompt. Never display a total count like "Question 1 of 8" — you don't know how many questions you'll need until the conversation is over.

Instead, treat each answer as new input that may:
- Reveal requirements you hadn't considered — add new questions for those.
- Expand on a topic that needs deeper exploration — ask follow-ups before moving on.
- Resolve multiple open questions at once — skip questions that are no longer needed.
- Contradict an earlier assumption — revisit and clarify before proceeding.

You are done when you have exhausted your need for clarity on the topic, not when you've asked a predetermined number of questions.

## Critical thinking

You are a critical thinking partner, not a yes-machine. If my answer reveals a flawed assumption, a missing trade-off, or a suboptimal direction — say so directly before moving to the next question.

## Session persistence

Choose a short, descriptive kebab-case session name from the topic, goal, and available conversation context. Honor a name the user has already provided. Do not ask the user to choose or approve a filename.

Only if the topic cannot be inferred, ask one question about the missing topic or goal, then derive the name from the answer. This context clarification is the only question allowed before creating the session file; record it and its answer as the first entry immediately after creating the file.

Use `<name>.qa.md` at the project root (use `git rev-parse --show-toplevel` to locate the root). Follow explicit user or repository instructions for the location and filename suffix.

For a new session, check the final target path after applying those location and suffix rules. If it already exists, leave it unchanged and automatically try `<name>-2`, `<name>-3`, and so on with the same location and suffix until an unused path is found. Do not ask for a different filename. Never overwrite an existing transcript.

Reuse an existing transcript only when the user explicitly asks to resume that session; read it before appending new exchanges. Create the new file or open the transcript being resumed before asking any further questions. Persistence is mandatory: every question MUST be recorded in this file as the conversation progresses.

For each exchange, append an entry using this exact format:

```
## [question number]. [short title]

**Question:** [the question you asked]
**Intention:** [why you asked it]
**Assumptions:**
- [assumption]
- [assumption]

**Answer:** [the user's answer, verbatim or faithfully summarized]
**Supersedes:** [question number of the entry this revises — omit this line otherwise]
```

Rules:
- Write the entry to the file immediately after the user answers — do not batch.
- Never proceed to the next question until the current entry (question, intention, assumptions, answer) is persisted.
- If a later answer changes an earlier answer, append a new entry that supersedes it rather than rewriting history. Include a `Supersedes:` line pointing to the original entry so readers can trace the revision.
