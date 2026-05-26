# Quality Checklist

Use this checklist for formal pass/fail reviews of event definitions. Keep this file expandable; keep only the compressed quality gate in `../SKILL.md`.

## Event Names

1. Event name is past tense - records a fact, not a command or intention.
2. Event name uses domain language, not CRUD or technical jargon.
3. Event name is specific enough to understand without reading the payload.
4. One event captures one thing that happened.
5. No redundant suffixes such as `Event`, `Message`, or `Notification`.
6. No infrastructure or technology appears in event names.
7. No negative event names unless the negative term is natural domain language; prefer positive form with a reason field.
8. Naming format is consistent across the system.

## Integration Events

9. Integration events are prefixed or namespaced with bounded context or service name when collision is possible.
10. Integration events use shared vocabulary, not internal jargon.

## Event Type And Stream Identity

11. Persisted `event_type` is self-identifying for the domain/event schema contract.
12. Event type uses one canonical schema discriminator; do not duplicate the same version in both `event_type` and `schema_version`.
13. Event type revisions such as `OrderPlacedV2` are reserved for incompatible schema or semantic changes.
14. Stream names are compact readable storage addresses, not the source of schema identity.
15. Tenant, environment, region, and shard values are outside `event_type` and present in metadata/context when consumers need them.

## Field Names

16. Event captures Who and When through typed event context, or through payload fields only when the actor or time is part of the domain fact.
17. Field names use domain language without vague names or abbreviations.
18. Identifiers are explicit, e.g. `order_id` instead of `id`.
19. Temporal fields use `_at` or `_on` suffixes with past-tense meaning.
20. Enums are preferred over booleans; booleans use predicate form when unavoidable.
21. No polymorphic payloads; split different shapes into separate events.
22. No PII directly in immutable payloads; use identifier references.
23. Monetary amounts include currency.
24. Collection fields are plural and scalar fields are singular.
25. Domain event payloads contain no computed or derived fields.
26. Field casing is consistent across the system.

## Record Boundaries

27. Record metadata, event context, and payload fields are separated.
28. Generic causality, occurrence time, correlation, causation, and persistence metadata are not duplicated in payload once typed context is available.
29. Ownership or authorization is validated against domain state or policy, not inferred from `actor_id`.
30. Event handlers can be tested with immutable recorded-event fixtures.
