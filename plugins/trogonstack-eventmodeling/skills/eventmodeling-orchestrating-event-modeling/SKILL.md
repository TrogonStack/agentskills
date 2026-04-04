---
name: eventmodeling-orchestrating-event-modeling
description: >-
  Orchestrates complete event modeling workflow from requirements to code
  generation. Models architecture as UI/Processor → Command → Event → Read
  Model. Use when modeling a domain end-to-end from requirements. Do not use
  for: executing a single step in isolation (invoke the named step skill
  directly, e.g., eventmodeling-brainstorming-events for Step 1 or
  eventmodeling-elaborating-scenarios for Step 7), validating an
  already-completed model (use eventmodeling-validating-event-models), or
  modernizing legacy systems (use eventmodeling-integrating-legacy-systems).
allowed-tools: AskUserQuestion, Write
---

# Orchestrating Event Modeling

Coordinates the 9-step Event Modeling workflow. Each step delegates to a
specialized skill — this skill holds the sequence, transition conditions, and
what to carry forward between steps.

---

## Interview Phase

**Skip if**: user has provided a clear domain description, requirements or
scope, and stated output goal (code, design, learning, docs).

**When interviewing**, use AskUserQuestion:

1. **Domain** — "What are you modeling? Describe the business process in 2-3
   sentences."
2. **Requirements state** — "(A) Written requirements/user stories, (B) Rough
   ideas, (C) Existing system to reverse-engineer?"
3. **Goal** — "(A) Learning event modeling, (B) Generate production code,
   (C) Design validation, (D) Team documentation?"
4. **Constraints** — "Any constraints? (timeline, external integrations, team
   size, target language/framework)"
5. **Starting point** — "Are you starting from scratch, or do you already have
   outputs from earlier steps (event list, commands, scenarios)?"

Confirm understanding before proceeding: "So we're modeling [domain], goal is
[goal], constraints are [constraints]. Starting from [step]. Does that match?"

**Capture findings** — write to `.trogonai/interviews/[project-name]/EVENTMODELING.md`:

```markdown
# Event Modeling: [Project Name]

**Project**: [project-name]
**Started**: [ISO date]
**Goal**: [learning / production code / design validation / documentation]
**Constraints**: [timeline, integrations, team size, language]

## Interview Trail

| Step | Skill | Status | Key Output |
|------|-------|--------|------------|
| Orchestration | eventmodeling-orchestrating-event-modeling | Done | Domain scoped, starting point confirmed |
```

Update this file as each step completes.

---

## Mid-Workflow Entry

If the user already has outputs from earlier steps, start from where they are.
Ask which steps are complete and what artifacts exist. Do not re-run completed
steps — pick up from the first incomplete step.

---

## Workflow

### Step 1: Brainstorm Events

Invoke `eventmodeling-brainstorming-events`.

**Input**: Domain requirements and any existing knowledge about the domain.
**Output to carry forward**: Event list + Role Catalog. The Role Catalog (all
human roles and system actors) feeds into every subsequent step.
**Gate**: Do not proceed until the Role Catalog exists and events cover all
known business processes.

---

### Step 2: Plot Events

Invoke `eventmodeling-plotting-events`.

**Input**: Event list from Step 1.
**Output to carry forward**: Chronological event timeline showing causal
dependencies between events.
**Gate**: Timeline should read as a coherent narrative before proceeding.

---

### Step 3: Storyboard

Invoke `eventmodeling-storyboarding-events`.

**Input**: Event timeline + Role Catalog.
**Output to carry forward**: UI mockups/wireframes with one swimlane per
human role, showing what data each screen displays and collects.
**Gate**: Every human role from the Role Catalog has at least one screen.

---

### Step 4: Identify Inputs

Invoke `eventmodeling-identifying-inputs`.

**Input**: Storyboards + Role Catalog.
**Output to carry forward**: Command definitions, each attributed to a specific
role or system processor.
**Gate**: Every UI action in the storyboards maps to a named command.

---

### Step 5: Identify Outputs

Invoke `eventmodeling-identifying-outputs`.

**Input**: Event list + Commands from Step 4.
**Output to carry forward**: Read model definitions — projections of events
optimized for UI and processor queries.
**Gate**: Every screen data need from the storyboards is satisfied by a read
model.

---

### Step 6: Apply Conway's Law

Invoke `eventmodeling-applying-conways-law`.

**Input**: Full event model so far (events, commands, read models).
**Output to carry forward**: System swimlanes mapping events and commands to
team boundaries.
**Gate**: Each boundary can be independently owned by a team. Skip this step
if Conway's Law boundaries are not relevant to the project.

---

### Step 7: Elaborate Scenarios

Invoke `eventmodeling-elaborating-scenarios`.

**Input**: Commands and read models.
**Output to carry forward**: Given-When-Then specifications for each command
and view, including happy paths, validation failures, and edge cases.
**Gate**: At least one scenario per command before proceeding.

---

### Step 8: Check Completeness

Invoke `eventmodeling-checking-completeness`.

**Input**: Full model — events, commands, read models, scenarios, Role Catalog.
**Output to carry forward**: Field traceability matrix confirming every field
has an origin and a destination. List of any gaps found.
**Gate**: All gaps resolved or explicitly accepted before proceeding.

---

### Step 9: Validate

Invoke `eventmodeling-validating-event-models`.

**Input**: Complete event model.
**Output**: Validation report with PASS / PASS WITH WARNINGS / FAIL verdict.
**Gate**: PASS verdict before declaring the model ready for implementation.

If FAIL: address findings and re-invoke `eventmodeling-validating-event-models`.

**Optional — Production Readiness Checklist**: Invoke
`eventmodeling-validating-event-models-checklist` when the model is destined
for production. It runs 23 architectural checks across 7 phases and returns a
PASS / PASS WITH WARNINGS / FAIL verdict independently of Step 9. A PASS on
Step 9 does not substitute for this checklist when production readiness is
required.

---

## Final Output

A complete event model consisting of:
- Role Catalog (human roles and system actors with permissions)
- Chronological event timeline
- UI storyboards with role-based swimlanes
- Command definitions with actor attribution
- Read model designs
- System boundaries (if Conway's Law applied)
- Given-When-Then scenarios
- Completeness verification
- Validation report with readiness verdict

### Optional Follow-on Skills

These skills are not part of the 9-step main path but extend the model for
specific needs:

- **`eventmodeling-designing-event-models`** — Use when stream identity,
  per-command state shapes, or event causality need detailed design work. Can
  be applied at any step where those decisions arise, most commonly during or
  after Step 1.
- **`eventmodeling-optimizing-stream-design`** — Use after the model is
  complete to validate stream growth estimates and snapshotting decisions.
- **`eventmodeling-translating-external-events`** — Use when external systems
  (webhooks, IoT, third-party APIs) need to feed into the domain model.
- **`eventmodeling-slicing-event-models`** — Use after Step 9 PASS to break
  the model into independently deployable feature slices and plan parallel
  team implementation.

---

## Quality Checklist

- [ ] All 9 modeling steps completed — no step skipped without explicit reason
- [ ] Role Catalog exists with named human roles and system processors
- [ ] Every command is attributed to a specific role from the Role Catalog
- [ ] Every read model satisfies at least one UI or processor query need
- [ ] At least one Given-When-Then scenario exists per command
- [ ] Completeness check shows no unresolved field traceability gaps
- [ ] Validation returns PASS or PASS WITH WARNINGS with all critical issues resolved
- [ ] Interview trail in `.trogonai/` updated with status of each completed step
