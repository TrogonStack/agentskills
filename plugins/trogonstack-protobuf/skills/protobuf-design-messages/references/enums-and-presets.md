# Enums: Exhaustive Choice, Not a Growable Boolean

Use this reference when defining an enum, naming its values, or designing a preset/option field such as an access or visibility level.

## Zero Value Is Unspecified, and Unspecified Is a Rejection

The zero value of every enum must end in `_UNSPECIFIED` (buf lint rule `ENUM_ZERO_VALUE_SUFFIX`). That value exists because every enum field that is never explicitly set reads as its zero value on the wire; naming it `_UNSPECIFIED` makes that silent default visible instead of letting it masquerade as a real choice.

Enum value names are prefixed with the enum's name (buf lint rule `ENUM_VALUE_PREFIX`), which also keeps C++ scoping, where enum value names share their enclosing scope, from colliding across enums in the same file:

```protobuf
// Avoid: unprefixed values collide with another enum's values in the same package,
// and the zero value reads as a real default.
enum Visibility {
  PRIVATE = 0;
  PUBLIC = 1;
}

// Prefer: prefixed values, explicit unspecified zero value.
enum Visibility {
  VISIBILITY_UNSPECIFIED = 0;
  VISIBILITY_PRIVATE = 1;
  VISIBILITY_PUBLIC = 2;
}
```

## An Omitted Choice Must Not Silently Widen Behavior

`_UNSPECIFIED` is a value the wire format can produce without anyone intending it: an old client built before the field existed, a caller who forgot to set it, a bug. The service must reject that value rather than resolve it to a convenient default, especially when the convenient default is the permissive one.

Consider an access preset on a resource:

```protobuf
enum AccessPreset {
  ACCESS_PRESET_UNSPECIFIED = 0;
  ACCESS_PRESET_PRIVATE = 1;
  ACCESS_PRESET_ORGANIZATION = 2;
  ACCESS_PRESET_PUBLIC = 3;
}

message CreateProject {
  AccessPreset access_preset = 1;
}
```

If the service treats `ACCESS_PRESET_UNSPECIFIED` as `ACCESS_PRESET_PUBLIC` "so something reasonable happens," an old client, a client with a bug, or a caller who genuinely forgot the field just made the resource public by omission. The creator never chose that, and the resource the creator meant to keep private is now exposed. The only safe reading of `UNSPECIFIED` for a field like this is "reject the request and ask the caller to choose," never "pick the widest option on their behalf."

Contrast that with a field where `UNSPECIFIED` defaulting to the narrowest, most conservative option would be safe. The service-level decision depends entirely on what gets exposed by resolving the default one way or the other; the schema's job is to make `UNSPECIFIED` a visible, named state so that decision has to be made on purpose rather than falling out of whatever the zero value happens to be.

```protobuf
// Avoid: service code that treats UNSPECIFIED as a convenient permissive default.
switch (request.access_preset()) {
  case AccessPreset::ACCESS_PRESET_UNSPECIFIED:
  case AccessPreset::ACCESS_PRESET_PUBLIC:
    return CreateWithPreset(AccessPreset::ACCESS_PRESET_PUBLIC);
  // ...
}

// Prefer: reject UNSPECIFIED explicitly; see references/presence-and-validation.md
// for enforcing this at the schema layer with protovalidate.
if (request.access_preset() == AccessPreset::ACCESS_PRESET_UNSPECIFIED) {
  return InvalidArgumentError("access_preset is required");
}
```

## Prefer an Enum or a `oneof` Over a Boolean That Will Grow

A boolean field locks a concept into exactly two states forever; adding a third state means adding a second boolean and reconciling the combinations it creates. If there is any chance the concept has more than two states eventually, model it as an enum from the start:

```protobuf
// Avoid: a boolean that is one feature request away from needing a third state.
bool is_archived = 1;

// Prefer: an enum that can grow.
enum ProjectState {
  PROJECT_STATE_UNSPECIFIED = 0;
  PROJECT_STATE_ACTIVE = 1;
  PROJECT_STATE_ARCHIVED = 2;
}
```

When two or more fields are mutually exclusive ways of saying the same thing (a result is either a success payload or a fault, never both), use `oneof` instead of a pair of optional fields plus a discriminator boolean; see [references/event-sourced-contracts.md](event-sourced-contracts.md) for a `oneof` used to model a fault.

## Review Questions

- Does every enum's zero value end in `_UNSPECIFIED`, and are all values prefixed with the enum name?
- Is there service code anywhere that treats an enum's `UNSPECIFIED` value as a usable default rather than rejecting it?
- Would resolving `UNSPECIFIED` to a default ever widen access, cost, or scope beyond what the caller explicitly chose?
- Is there a boolean field describing something that could plausibly need a third state?
