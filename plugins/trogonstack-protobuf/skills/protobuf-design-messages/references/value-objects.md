# Value Objects Instead of Primitives

Use this reference when defining an identifier, a reference to another resource, a pointer to content stored out of line, a quantity, a monetary amount, or an instant in time.

## Identifiers Are Wrapper Messages

A bare `string` or `int64` identifier carries its meaning only in the field name. Once that string crosses a function boundary, a log line, or a generic container, the meaning is gone and the compiler can no longer stop a `UserId` from being passed where a `ProjectId` is expected.

```protobuf
// Avoid: primitive obsession. Nothing stops a swap between two string fields.
message TransferOwnership {
  string project_id = 1;
  string new_owner_id = 2;
}

// Prefer: single-field wrapper messages. A ProjectId cannot be passed where a UserId belongs.
message ProjectId {
  string value = 1;
}

message UserId {
  string value = 1;
}

message TransferOwnership {
  ProjectId project_id = 1;
  UserId new_owner_id = 2;
}
```

The field name still carries the `_id` suffix even though the type already says "identifier." See [references/json-field-naming.md](json-field-naming.md) for why: a schema-less JSON reader sees only the key.

## References Are Value Objects, Not Bare Strings

The same reasoning applies to anything that points at a resource with more than one piece of identifying information: pair the fields in a named message instead of scattering them.

```protobuf
// Avoid: two separate fields that only mean something together.
message RunJobResponse {
  string result_bucket = 1;
  string result_key = 2;
}

// Prefer: a reference value object.
message ArtifactRef {
  string bucket = 1;
  string key = 2;
}

message RunJobResponse {
  ArtifactRef result_ref = 1;
}
```

## Claim Checks: a Locator and a Digest, Together

Content stored out of line (blob storage, an artifact store, a large payload moved out of the message body) is the [claim check pattern](https://www.enterpriseintegrationpatterns.com/ClaimCheck.html): the message carries a claim, not the content. The claim is only useful if it says both where the content is and what it should hash to. Keep both fields in one value object; a locator in one message and a digest in a sibling field invites the two being paired wrong after an edit or a partial copy.

```protobuf
// Avoid: locator and digest live in different messages, so nothing stops
// a locator from one artifact pairing with a digest from another.
message StartRestore {
  string storage_locator = 1;
}

message RestoreManifest {
  string expected_digest = 1;
}

// Prefer: the claim check is one value object with both fields.
message Digest {
  string algorithm = 1;  // e.g. "sha256"
  bytes value = 2;
}

message ClaimCheck {
  string storage_locator = 1;
  Digest digest = 2;
}

message StartRestore {
  ClaimCheck claim_check = 1;
}
```

## Units Live in the Name

A bare numeric field answers "how much" but not "of what unit." Suffix the field name with the unit so the number is self-describing wherever it travels, including into JSON and logs. This mirrors [Google AIP-141](https://google.aip.dev/141): "Quantities with a clear unit of measurement (such as bytes, miles, and so on) must include the unit of measurement as the suffix."

```protobuf
// Avoid: ambiguous unit.
int64 size = 1;
int32 timeout = 2;

// Prefer: the unit travels with the value.
int64 size_bytes = 1;
int32 timeout_seconds = 2;
```

## Money Is Amount Plus Currency, Never a Float

A bare amount is incomplete without its currency, and floating point loses cents at scale. Keep the amount as a fixed-point integer, name it with its unit, and pair it with an ISO 4217 currency code, in one message:

```protobuf
// Avoid: no currency, and floating point drifts under repeated arithmetic.
double price = 1;

// Prefer: fixed-point amount, explicit unit, explicit currency.
message Money {
  int64 amount_micros = 1;
  string currency_code = 2;  // ISO 4217, e.g. "USD"
}
```

`google.type.Money` (units plus nanos, also paired with an ISO 4217 `currency_code`) is the widely used precedent for this shape; the fields above follow the same principle with micros instead of nanos as the fractional unit. Either precision works as long as the amount, its fractional unit, and the currency travel together in one message.

## Instants Are Timestamps, Named With `_at`

Use `google.protobuf.Timestamp` for a point in time, not an `int64` of ambiguous epoch and unit, and suffix the field name `_at` to mark it as an instant rather than a duration or a date-only value:

```protobuf
import "google/protobuf/timestamp.proto";

// Avoid: ambiguous unit (seconds? millis?) and epoch.
int64 created = 1;

// Prefer: self-describing type, _at suffix.
google.protobuf.Timestamp created_at = 1;
```

## Review Questions

- Is any identifier a bare `string` or `int64` instead of a single-field wrapper message?
- Does any reference scatter its fields across sibling fields instead of one value object?
- Does any out-of-line content pointer carry a locator without the digest it is verified against, or vice versa, in separate messages?
- Does any numeric field omit its unit from the name?
- Does any monetary field use `float`/`double`, or omit the currency?
- Does any instant use a raw integer instead of `google.protobuf.Timestamp`, or omit the `_at` suffix?
