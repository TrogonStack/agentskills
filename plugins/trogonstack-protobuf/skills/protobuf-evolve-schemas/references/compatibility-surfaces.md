# Compatibility Surfaces

Use this reference when deciding which `buf breaking` category to run, or when a proposed change needs to be checked against more than the wire format.

## Why "Non-Breaking" Needs an Audience

A protobuf schema has independent consumers of "did this change break compatibility":

- **Binary wire format**: field numbers and wire types, decoded without field names.
- **JSON (ProtoJSON)**: field names (or `json_name`) as object keys, enum values by name.
- **Generated source code**: identifiers in every target language, which care about names, not numbers.

A change can be safe for one surface and a break for another. [buf's breaking change categories](https://buf.build/docs/breaking/rules/) map directly onto these surfaces, from strictest to most permissive:

| Category | What it checks | Breaks when |
|---|---|---|
| `FILE` (buf's default) | Generated source code, per file | Code moves between files; some languages (Python) generate per-file bindings that break when a type moves files, even within the same package |
| `PACKAGE` | Generated source code, per package | Looser than `FILE`: types can move between files as long as they stay in the same package |
| `WIRE_JSON` | Wire and JSON encoding together | A change breaks binary decoding, or breaks JSON because JSON serializes by field/enum name, not number |
| `WIRE` | Wire encoding only | A change breaks binary decoding (field number/type changes, incompatible field number reuse) |

## Pick `WIRE_JSON` as the Minimum if Anyone Consumes JSON

`WIRE` alone only protects binary gRPC consumers. If the schema is exposed through a JSON-speaking transport (gRPC-Gateway, Connect, a webhook payload, a REST-ish proxy, or any client library that round-trips through JSON instead of binary), `WIRE_JSON` is the floor, not `WIRE`. A field rename passes a `WIRE`-only check and fails `WIRE_JSON`, because the wire format never cared about the name but the JSON key is the name.

`buf breaking` takes its category from `breaking.use` in `buf.yaml`, and an unset `breaking` section means `FILE`. The same rename gives a different result under each configuration:

```yaml
# buf.yaml: a field rename passes. Only binary decoding is checked.
breaking:
  use:
    - WIRE
```

```yaml
# buf.yaml: the same rename fails with FIELD_SAME_NAME.
breaking:
  use:
    - WIRE_JSON
```

Under the default (`FILE`) the rename fails too, on both the JSON check and the generated-code name check. (A `json_name` override alone, with the field name unchanged, is what `FIELD_SAME_JSON_NAME` catches instead.)

`FILE` and `PACKAGE` are supersets of `WIRE_JSON` (buf's docs say so in the `FIELD_SAME_JSON_NAME` rule), so when generated source code is a first-class consumer, which it is in most codebases, pick `FILE` or `PACKAGE` instead of `WIRE_JSON`; you keep every JSON check and add the generated-code ones. Pick one category per module rather than combining them.

## Review Questions

- Does the `buf breaking` configuration include `WIRE_JSON` (or stricter) for any package with a JSON-speaking consumer?
- Was the proposed change checked against the category that actually matches this package's consumers, not just whichever category happens to pass?
- For a cross-language codebase, is the category `FILE` or `PACKAGE`, so generated-source breaks are caught along with wire and JSON breaks?
