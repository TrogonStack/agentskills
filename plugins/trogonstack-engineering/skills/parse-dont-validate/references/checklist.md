# Parse Don't Validate Checklist

- [ ] Parsing occurs at the earliest trusted boundary.
- [ ] The refined type carries the stable invariant in its API.
- [ ] Construction bypasses are restricted or impossible.
- [ ] The representation is immutable or mutation preserves its invariant.
- [ ] Failure is explicit and preserves useful context.
- [ ] Downstream APIs accept refined values instead of raw primitives.
- [ ] Checks for mutable state and external facts remain at the operation boundary.
- [ ] Repeated checks enforce distinct invariants or have been removed.
