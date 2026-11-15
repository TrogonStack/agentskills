---
name: eda-bound-process-lifetime
description: "Design or review event-driven process managers, sagas, and multi-step workflows so every instance provably ends within a known maximum lifetime (T_max). Lists the waiting states, gives each one a deadline and a named exit, keeps loops counted, makes late timers and duplicates harmless, and computes T_max from the longest path. Produces a lifecycle table, findings for every unbounded wait or loop, and the T_max derivation. Use when designing a saga, process manager, approval flow, OAuth or payment flow, or any aggregate with pending or awaiting states; when reviewing a state table in an ADR or design doc; when instances get stuck, need a reaper, or block a version cutover; and when asking 'how long can this run', 'when can we delete the old version', or 'how long must we keep these streams'. Do not use for long-lived entities that never finish (accounts, sessions, connections), periodic reconcilers, event naming or payload design (use event-definition), full event modeling workflows, or race conditions (use concurrency-find-toctou)."
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Bash
---

# Bound Process Lifetime

A process that can wait forever will eventually be waiting forever. Give every wait a deadline and an exit, count every loop, and the longest an instance can live becomes a number you compute instead of a hope.

## Core Principle

A process manager (saga, workflow, multi-step aggregate) coordinates other actors: it sends a command, then waits for something to come back. Each wait is a bet that the other side answers. When the bet has no deadline, the instance can sit in that state indefinitely, and nobody can say when it ends.

Once every waiting state has a deadline and every loop has a count, the maximum lifetime `T_max` follows from the definition: add the deadlines along the longest path. That number turns operational problems into waiting:

- **Version cutover**: new instances start on the new version; old instances are guaranteed finished by `deploy_time + T_max`, then the old code is deleted. No in-flight state migration.
- **Retention**: a finished instance's stream is kept for `T_max` plus an audit margin, not forever by default.
- **Stuck instances**: impossible by construction. Every instance ends in a typed terminal state.

The restriction is the feature. You give up "wait as long as it takes", and in exchange the lifetime question becomes decidable. There is no framework or DSL behind this skill: it is a discipline applied to whatever state table, code, or design document exists, and the output is a lifecycle table a team can later encode and check mechanically.

## When It Does Not Apply

Some things are entities, not processes: an account, a session log, a connection, a subscription. They have no terminal outcome by design. Do not force deadlines onto them. The bounded processes are the flows that coordinate them (opening an account, refreshing a credential, settling a payment). A periodic reconciler is a loop, not a process; bound each run, not the reconciler. A process that truly must run indefinitely (a perpetual monitor) is decomposed into chained bounded instances, each handing off to the next.

## Principles

Apply them in order. A state or loop that fails an earlier principle is a finding; the later principles shape the fix. Each one names its reference; read it when the situation matches, not up front.

### 1. Waits Are Where Lifetime Goes

Instant transitions (decide, emit, move on) cost no lifetime. Only waiting states do: a command was sent and the process needs an event it does not control (a reply, a callback, a human, a provider, a timer). The first job is to separate waiting states from instant ones, because only waiting states need deadlines and only they count toward `T_max`.

Read [references/principles/waits-are-where-lifetime-goes.md](references/principles/waits-are-where-lifetime-goes.md) when building the state list or when it is unclear whether a state waits.

### 2. Every Waiting State Has A Deadline And A Named Exit

A deadline without an exit is a log line; an exit without a deadline is a hope. Each waiting state needs both: how long, and which event ends the state when time runs out (`Expired`, `OutcomeUnknown`, `Failed` with a typed reason). Choosing what the timeout *means* is a business decision, and the skill asks for it rather than inventing it. A background reaper that sweeps "stuck" instances is evidence of a missing deadline, not a substitute for one.

Read [references/principles/deadline-and-exit.md](references/principles/deadline-and-exit.md) when a state lacks either, when choosing a deadline value, or when a reaper exists.

### 3. Time Is A Message

The deadline fires as a message the process schedules for itself on entering the waiting state, delivered into the same stream or correlation as every other input. The process never reads a wall clock to decide. If the real reply arrives first, the late timer must be refused or absorbed like any other stale command. The scheduler's delivery delay is part of the bound and has to be stated.

Read [references/principles/time-is-a-message.md](references/principles/time-is-a-message.md) when designing how deadlines fire, or when the code polls, sleeps, or compares timestamps to decide.

### 4. Loops Are Counted, Never Conditional

`retry up to 3 times` is bounded; `retry until it works` is not. `repeat at most 10 iterations` is bounded; `while not shipped` is not. A loop whose exit depends only on the outside world adds unbounded lifetime even if every single wait inside it has a deadline. Count it, or move the repetition out of the process (a fresh instance per attempt, chained).

Read [references/principles/loops-are-counted.md](references/principles/loops-are-counted.md) when the design has retries, polling, repeat-until, or a state that can be re-entered.

### 5. Concurrent Waits Share One Window

Waiting for A and B together is one wait, not two: one deadline covers the join, and the partial states (got A, got B) inherit it rather than restarting it. Waiting for A or B is one wait that the first arrival ends. A phase that spans several states (consent requested, then callback received) is often one window set when the phase begins. Restarting a timer per partial state silently multiplies the bound.

Read [references/principles/shared-windows.md](references/principles/shared-windows.md) when the process waits on several inputs at once, or when a deadline is set once and spans several states.

### 6. Terminal States Absorb

Every path ends in a typed terminal state (`Completed`, `Failed`, `Expired`, `Cancelled`, `Killed`). Once there, duplicates, late replies, and late timers change nothing: they are refused or recorded as no-ops. Deterministic message identity (derived from the instance and step, not random) makes redelivery harmless. Without absorption, a late timer can reopen a finished instance and the bound is fiction.

Read [references/principles/terminal-states-absorb.md](references/principles/terminal-states-absorb.md) when checking what happens after the end, or when a late or duplicate input could move a finished instance.

### 7. Lifetime Is The Longest Path

`T_max` is the longest path from the initial state to any terminal state, where each waiting window contributes its deadline once and instant transitions contribute zero, plus the scheduler's delivery delay for each timer on the path. Compare it to a declared budget. A budget exceeded is a design conversation, not a rounding error.

Read [references/principles/longest-path.md](references/principles/longest-path.md) when computing `T_max`, when there is no budget yet, or when the result surprises anyone.

## Procedure

Works the same for a new design and for a review of an existing one (code, ADR state table, sequence diagram, prose).

1. **Classify.** Decide whether the subject is a process (it has terminal outcomes) or an entity. For an entity, stop and say so, naming the processes inside it that could be bounded instead.
2. **List states.** Build the lifecycle table (template below): every state, what enters it, what leaves it, which states are terminal, and which events record progress without changing state (self-loops).
3. **Mark waits.** Classify each non-terminal state as instant or waiting (principle 1).
4. **Give each wait a deadline and an exit** (principles 2, 3, 5). Group states that share a window. Where a value or meaning is missing, ask with AskUserQuestion; never invent a business timeout. In a review, each missing one is a finding.
5. **Check loops** (principle 4). Every re-entry is counted or moved out.
6. **Check absorption** (principle 6): late timer, duplicate command, late reply, each against every terminal state and every state the timer no longer covers.
7. **Compute `T_max`** (principle 7). Show the derivation. Ask for the budget if none is declared.
8. **Report.** Lifecycle table, findings (one per gap), `T_max` derivation, and residuals.

## Lifecycle Table

```markdown
| State | Kind | Entered by | Left by | Window | Deadline | On deadline |
|---|---|---|---|---|---|---|
| <name> | initial / waiting / instant / terminal | <event> | <events> | <window name or -> | <duration or MISSING> | <exit event or MISSING> |
```

Self-loops go in "Left by" as `<event> (stays)`. Read [references/review/lifecycle-table.md](references/review/lifecycle-table.md) for a filled example and how to encode the table so a program can check it.

## Finding Format

```
### <short title>

- Location: <file:line, ADR section, or diagram element>
- State: <the waiting state or loop>
- Waiting on: <the input the process does not control>
- Missing: <deadline | exit | count | absorption | budget>
- Consequence: <what happens when the input never comes: stuck instance, unbounded retention, blocked cutover>
- Principle: <by name>
- Fix: <deadline value or how to choose it, exit event, window, and who schedules the timer>
- Residual: <what the fix still does not cover, or "none">
```

Read [references/review/finding-template.md](references/review/finding-template.md) for a fully worked example.

## Making It Mechanical Later

Without a framework, the lifecycle table is the artifact. When a team wants the bound enforced rather than reviewed, the table becomes a declaration next to the schema (a protobuf custom option, a YAML file) and a small program checks it in CI: every name resolves, every waiting state is covered by a timer, every state reaches a terminal one, no cycles except self-loops, and `T_max` fits the budget. A conformance test then proves the hand-written state machine agrees with the declaration.

Read [references/review/declare-and-check.md](references/review/declare-and-check.md) when the user wants enforcement, a schema annotation, or a CI check.

## Quality Checklist

- [ ] The subject was classified as a process or an entity, and entities were not given deadlines.
- [ ] Every non-terminal state is marked instant or waiting.
- [ ] Every waiting state has a deadline value and a named exit event, or a finding saying it does not.
- [ ] No deadline value or timeout meaning was invented; missing ones were asked for or reported.
- [ ] States sharing one window are grouped and counted once.
- [ ] Every loop has a count, or a finding.
- [ ] Late timers, duplicates, and late replies are shown to be refused or absorbed in every terminal state.
- [ ] `T_max` is derived step by step, includes the timer delivery delay, and is compared with a budget.
- [ ] Any reaper or sweeper is explained as a missing deadline or justified as a backstop.
