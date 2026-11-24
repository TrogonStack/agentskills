# Value Object Checklist

- [ ] The primitive represents a named domain concept.
- [ ] The stable invariant is stated explicitly.
- [ ] Construction cannot bypass the invariant.
- [ ] The representation is immutable or mutation preserves the invariant.
- [ ] Equality reflects the domain concept.
- [ ] Serialization and deserialization preserve the concept's contract.
- [ ] Downstream APIs accept the value object instead of the primitive.
- [ ] Checks for mutable state and external facts remain at operation boundaries.
- [ ] Repeated stable-invariant checks have been removed.
