# Review Checklist

Each item is a symptom of a principle, not a rule on its own. When an item fails, read the linked reference and judge the schema by the principle behind it; a justified exception passes, a compliant schema that misses the point does not.

## JSON Field Naming ([json-field-naming.md](json-field-naming.md))

- [ ] No field name reads as inline content (`project`, `result`, `owner`) while its type is an id or ref wrapper
- [ ] Single opaque identifiers are suffixed `_id`; structured references are suffixed `_ref`
- [ ] `parent` is used only for hierarchy position; kinship is qualified with a type (`parent_session_id`), never spelled `parent_id`

## Value Objects ([value-objects.md](value-objects.md))

- [ ] No identifier is a bare `string` or numeric type; each is a single-field wrapper message
- [ ] No reference scatters its fields across siblings instead of one value object
- [ ] Any out-of-line content pointer carries its locator and its digest together in one message
- [ ] Numeric fields with a unit carry that unit in the field name
- [ ] Monetary fields pair a fixed-point amount with an ISO 4217 currency code, never a bare float
- [ ] Instants use `google.protobuf.Timestamp` with an `_at` suffix

## Enums and Presets ([enums-and-presets.md](enums-and-presets.md))

- [ ] Every enum's zero value is named `<ENUM>_UNSPECIFIED`
- [ ] Every enum value is prefixed with the enum's name
- [ ] Service code rejects `UNSPECIFIED` rather than resolving it to a default, especially a permissive one
- [ ] No boolean field models a concept that could plausibly need a third state

## Presence and Validation ([presence-and-validation.md](presence-and-validation.md))

- [ ] No field uses `LEGACY_REQUIRED` (or proto2 `required`) in a stable, non-pre-release package
- [ ] Schema-checkable invariants (presence, range, pattern, enum exclusion, cross-field rules) carry `buf.validate` annotations
- [ ] Every `buf.validate` annotation is backed by a validator actually running on every path that accepts the message
- [ ] No invariant that needs live state (uniqueness, existence, authorization) is expressed only as a schema-level constraint

## Event-Sourced Contracts ([event-sourced-contracts.md](event-sourced-contracts.md))

Skip this section for plain CRUD/RPC schemas.

- [ ] Commands are imperative; events are past tense
- [ ] The creation event carries every fact only knowable at creation time
- [ ] No event duplicates a fact owned by another system
- [ ] Faults are a `oneof` of specific types, not a generic error string
- [ ] Comments state invariants, not restatements of field names

## Naming Collisions ([naming-collisions.md](naming-collisions.md))

- [ ] New names were checked against the product's existing vocabulary, not only the local file
- [ ] Any discovered collision was renamed before the package generates code
