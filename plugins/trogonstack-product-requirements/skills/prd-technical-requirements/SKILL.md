---
name: prd-technical-requirements
description: Draft the Technical Requirements of a PRD by capturing the technical constraints and requirements the product must meet. Drives discovery through performance, scale, reliability, security, privacy, compliance, integrations, platforms, accessibility, and localization. Writes to `.trogonai/project/{projectid}/prd/technical-requirements.prd.md`. Use when the user wants to capture the non-functional and platform constraints engineering will design against.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
---

# PRD: Technical Requirements

## Purpose

Capture the technical constraints and non-functional requirements the product must meet, so engineering can design against concrete targets and the product team can make trade-offs explicit before implementation.

This file is not a technical design or architecture document. It is the contract of constraints the design must satisfy.

## Shared Operating Model

Use `requirements-operating-model` before writing when constraints depend on product shape, metrics, existing context, or Blueprint handoff. Keep architecture decisions in Blueprints.

## When to Use

- A PRD is approaching engineering planning and lacks non-functional targets
- The team is debating "is this fast enough?" / "is this secure enough?" with no shared bar
- Compliance, accessibility, or platform constraints are implicit and need to be made explicit

## Project Identifier

Before writing, determine the `projectid`:

1. If the user has supplied one, use it verbatim.
2. Otherwise, ask for it once. The `projectid` should be a stable, kebab-case identifier for the product/initiative.
3. Confirm the resolved path before writing: `.trogonai/project/{projectid}/prd/technical-requirements.prd.md`.

If the file already exists, read it first and ask whether to **replace** or **refine** before overwriting.

## Read Existing Context

Before discovery, read these files when they exist:

- `.trogonai/project/{projectid}/prd/product-description.prd.md`
- `.trogonai/project/{projectid}/prd/success-metrics.prd.md`
- `.trogonai/project/{projectid}/prd/personas.prd.md`

Use them to ground constraints in user-facing surfaces, measurable goals, and persona contexts. If a technical target becomes an architecture decision, leave the constraint here and identify Blueprints as the owner for the design.

## Discovery

Ask through each category. For every requirement, push for a **number, a threshold, or a named standard**, not adjectives.

1. **Performance**
   - Target latency (p50, p95, p99) for the primary user actions
   - Throughput / requests per second or per minute
   - Cold start, time-to-first-byte, time-to-interactive where relevant
2. **Scale**
   - Expected users / tenants / records / events at launch and at 12 months
   - Peak vs steady-state ratios
   - Growth assumptions and their source
3. **Reliability & availability**
   - SLO (e.g., 99.9% over rolling 30 days)
   - Acceptable error budget burn
   - Recovery objectives: RTO, RPO
   - Graceful degradation expectations
4. **Security**
   - Authentication method(s)
   - Authorization model (roles, scopes, tenancy)
   - Data classification of inputs and outputs
   - Threat model concerns specific to this product
5. **Privacy & compliance**
   - Regulatory regimes that apply (GDPR, HIPAA, SOC 2, PCI, regional data residency)
   - PII / PHI / payment data handling
   - Retention and deletion requirements
   - Audit logging requirements
6. **Integrations**
   - Upstream systems consumed (APIs, events, files)
   - Downstream systems produced for
   - Sync vs async, contract ownership, failure semantics
7. **Platforms & environments**
   - Supported browsers / OS / device classes
   - Minimum hardware / network assumptions
   - Cloud / on-prem / hybrid constraints
   - Offline / intermittent connectivity behavior
8. **Accessibility**
   - WCAG level (typically AA)
   - Keyboard, screen reader, color contrast, motion expectations
9. **Localization & internationalization**
   - Languages at launch and in 12 months
   - Right-to-left support
   - Time zone, currency, date/number formatting
10. **Observability**
    - Logs, metrics, traces required from day one
    - Dashboards and alerts that must exist before GA
11. **Cost constraints**
    - Unit economics targets (cost per user / request / event) if relevant
    - Hard ceilings on infrastructure spend

For each category, the acceptable answer is either:

- A concrete requirement with a target, OR
- An explicit "Not a constraint for this product": which is itself useful information

Push back on:

- "Should be fast" → which action, what percentile, what number, on what hardware/network
- "Secure by default" → which standard, what threat
- "Globally available" → which regions, which latency target per region

## Quality Bar

The file is complete when:

- Every category has either a concrete target or an explicit "not a constraint"
- Performance numbers are tied to specific user actions, not the system as a whole
- Reliability targets are stated as SLOs with measurement windows
- Compliance regimes are named, not implied
- Each requirement is testable: a reviewer could write a verification for it

## Output

Write the complete file to `.trogonai/project/{projectid}/prd/technical-requirements.prd.md` using the template at `assets/technical-requirements-template.md`. Read it, substitute `{projectid}` and the date, and fill in each section from the discovery output. For any category that does not apply, record it under **Explicit non-constraints** rather than dropping the section.

## Writing Guidance

### Writing approach
- **Number, threshold, or named standard per category.** Every line is either a measurable target, a named regulation/standard, or an explicit non-constraint. Adjectives without numbers do not count.
- **Per user action, not per system.** "p95 < 200ms" only means something when paired with the action it covers. Latency budgets attach to user actions; SLOs attach to journeys.
- **Explicit non-constraints are first-class.** A category that does not apply is recorded under non-constraints with the reason. Silence is ambiguous; explicit absence is a decision.
- **Defend the number.** A target is more useful when paired with how it was chosen (benchmark, contract, regulatory minimum, user research). Numbers without provenance get re-negotiated under pressure.

### Tone and language
- **No adjectives without numbers.** "Fast", "scalable", "secure", "globally available" are flags to push back on. Replace with a value, a percentile, and a condition.
- **Name the standard.** WCAG AA, SOC 2 Type II, PCI DSS v4, GDPR Art. 17: name the regime and the article/level when relevant. "Follows best practices" is not a requirement.
- **Percentiles for latency, windows for SLOs.** Single-number latency hides the worst experience; an SLO without a measurement window is not enforceable.

### Scope
- **Contract of constraints, not design.** This file says *what* must be true, not *how* to satisfy it. Architecture, framework choice, and infrastructure topology belong in engineering design docs.
- **Non-functional and platform.** Performance, scale, reliability, security, privacy, integrations, platforms, accessibility, localization, observability, cost. Functional behavior belongs in FRDs.
- **No invention.** If a target is unknown, mark it as open with an owner and date: do not fabricate a number that will be treated as committed.

## Good vs Bad Example

**Good**

```md
## Performance
| User action | Metric | Target | Conditions |
|-------------|--------|--------|------------|
| Open Coaching Inbox | p95 latency | < 800 ms | desktop Chrome, fiber; US-East region |
| Save call note | p95 latency | < 1.5 s | mobile web, LTE; user already authenticated |

## Reliability & availability
- SLO: 99.9% availability for Save Call Note, measured over rolling 30 days.
- Error budget: 43.2 min / 30 days; freeze deploys on > 50% burn.
- RTO 30 min, RPO 5 min for Salesforce Bridge.

## Security
- Authentication: SSO via Okta OIDC; session 12h, refresh 30 days.
- Authorization: role-based: AE (own deals), Manager (team deals), Admin (org).
- Data classification: notes are Restricted (may contain customer PII).

## Privacy & compliance
- Regimes: SOC 2 Type II (annual), GDPR for EU tenants, CCPA for California users.
- Retention: call notes retained 7 years to match Salesforce; deletion request honored within 30 days per GDPR Art. 17.

## Explicit non-constraints
- Localization: English only at launch; not a constraint until EU expansion (Q3 2026).
- Offline behavior: not supported in v1; AE is online by job definition.
```

**Bad**

```md
## Performance
- Should be fast.

## Reliability & availability
- Should be highly available.

## Security
- Should follow best practices.

## Privacy & compliance
- Should be compliant.

## Localization
- Should support multiple languages.
```

The bad version is unfalsifiable: engineering cannot design against any of it, and the team has no shared bar to evaluate the result. Every line is an adjective that means whatever the reader wants.

## Anti-Patterns to Reject

- Adjectives without numbers ("fast", "scalable", "secure").
- One latency number for the whole system rather than per user action.
- SLOs without a measurement window.
- "Follows best practices" instead of naming the standard.
- Silently skipping a category: if it doesn't apply, say so explicitly.

## Allowed Tools

- **AskUserQuestion**: drive discovery and resolve `projectid`
- **Read**: load the existing file if it exists, to decide replace vs refine
- **Write**: write the file
