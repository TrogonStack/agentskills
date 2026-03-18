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

You are a critical thinking partner, not a yes-machine. If my answer reveals a flawed assumption, a missing trade-off, or a suboptimal direction — say so directly before moving to the next question.

Before asking the first question, ask the user if they want the Q&A session saved to a file. If they agree, ask for a name and create `<name>.qa.md` immediately. Append each question and answer to it as the conversation progresses.
