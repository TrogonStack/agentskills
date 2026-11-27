---
name: make-impossible-states-unrepresentable
description: "Apply the Impossible State Principle when designing or reviewing domain types. Use when a flag controls which fields must exist, sibling unions can disagree, or an Option, nullable field, or unwrap exists because different paths carry different data. Model the legal combinations with tagged unions and required case payloads."
allowed-tools:
  - Read
  - Write
  - Bash
---

# Make Impossible States Unrepresentable

Find a value the current type admits that the domain forbids. For example, a job marked successful may carry an error and lack its required result. A type for the outcome can express the rule directly with `Succeeded(result) | Failed(error)`.

## Choose the representation

1. Write down the legal cases using the domain's vocabulary. For each case, identify which fields are required, which can vary independently, and which have no meaning. Check the rules against actual producers and consumers. A caller skipping a field says little about whether the domain requires it.
1. Put a tagged union at the smallest level that owns **all the fields governed by the choice**. Give each variant the fields it owns and make its guaranteed values required. Keep shared fields on the enclosing record. Keep independent choices in separate fields when every combination is legal. For a before-and-after that shows how sibling unions can disagree, read the [fulfillment example](references/fulfillment.md).
1. Ask what `None` means **after the case is known**. Keep `Option<T>` when both absence and presence are legitimate within that case. If several fields can be absent only together, group them into one optional record. If absence changes what operations are legal, name the relevant state. A partially loaded view can have its own type when the full domain object requires the missing data.
1. Match on the variant where behavior diverges. Pass the narrowed payload to operations that require that case. Use exhaustive matching where supported so a new case identifies consumers that need a decision. If the language lacks tagged unions, use case-specific types and restrict construction and updates to operations that preserve the same invariant.

A variant establishes which values belong together. For rules within a value, such as the ordering of the dates in a pickup window, see [Design Value Objects](../design-value-objects/SKILL.md). When a wire format or stored record has a looser shape, retain its compatibility contract and parse it into a legal case or an explicit error at the boundary. See [Parse, Don't Validate](../parse-dont-validate/SKILL.md).

## Verify the model

- [ ] Construct an example of each legitimate case, including meaningful absence.
- [ ] Try the original contradiction through the public construction and update paths. The type checker or a restricted constructor must rule it out before domain code receives it.
- [ ] Trace a consumer that previously checked a flag and unwrapped a field. Matching the case now supplies its required values directly.
- [ ] If the model has a wire or storage contract, decode representative legacy data. For writable formats, encode each case and check its tag, payload, and treatment of absent fields against that contract.
