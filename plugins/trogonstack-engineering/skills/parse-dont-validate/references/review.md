# Parse Don't Validate Review

## Questions

- Can an unparsed primitive reach code that assumes the invariant?
- Can callers construct the refined type without parsing?
- Is the refined value immutable or protected by invariant-preserving operations?
- Does the parser preserve enough context to explain failure?
- Are repeated checks proving the same stable invariant, or do they protect mutable state or a new boundary?
- Is sanitization being confused with parsing? Sanitization transforms data; parsing establishes what the data means.

## Report Format

```markdown
### <boundary or invariant>

- Raw input: <current weak type and source>
- Refined type: <type that carries the invariant>
- Parser: <function or boundary that constructs it>
- Failure: <explicit error/result shape>
- Downstream change: <functions that now accept the refined type>
- Checks retained: <mutable or external facts still checked at the operation boundary>
- Duplicate checks removed: <same-invariant checks, or "none">
```
