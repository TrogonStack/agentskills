---
name: ask-question
description: >-
  Ask structured questions one at a time to gather requirements, context, or
  clarification. Each question includes the intention behind it and current
  assumptions. Use when the user wants to be interviewed about a topic, gather
  requirements, or needs help thinking through a problem step by step.
allowed-tools: Read, Write, AskUserQuestion
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

Before asking the first question, ask the user if they want the Q&A session saved to a file. If they agree, ask for a name and create `<name>.qa.md` immediately. Append each question and answer to it as the conversation progresses.
