# Layer 1: Codebase

The guardrail is the shape of the code. Nothing runs and nothing is read; the wrong thing is impossible or harder to write than the right thing. Paid once, when the change lands.

## Moves

- **Parse, do not validate.** A constructor returns a typed value (`EmailAddress`, `NonEmptyList`, `Money`) so downstream code never receives the raw form.
- **Narrow the signature.** Accept the domain type instead of `string`, a closed enum instead of a flag string, return a result type instead of throwing.
- **Remove the footgun.** Delete or make private the API that is easy to misuse, and leave one obvious path.
- **Draw the boundary.** Put the dependency behind a module or package the wrong caller cannot import.
- **Make the default safe.** Timeouts, escaping, and limits on by default, with an explicit and greppable opt-out.
- **Implement the rule once.** Refactor duplication into one place so the rule is enforced by a single implementation instead of remembered at every call site.

## Can This Layer Carry It?

Yes when the mistake is a value, call, or dependency the type system or module system can make unreachable. Usually no when the mistake is about behavior over time, cross-service agreement, or intent.

## When It Is Too Expensive Now

A breaking API change, a migration across many callers, or a public contract you do not own. Say so, carry the guardrail one layer down (often a lint), and record the codebase move as a follow-up. Do not decide a breaking change alone; ask.
