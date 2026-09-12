# Reference Writing

Support precise lookup of interfaces and behavior. Follow [Diataxis on reference](https://diataxis.fr/reference/).

## Describe the Contract

Define the interface and version. Mirror the system's structure for lookup without sequential reading. Use a consistent entry structure.

For APIs, configuration, or commands, document relevant signatures, types, units, required values, defaults, constraints, effects, and errors from authoritative evidence. Cover the promised scope rather than asserting completeness for an unexamined system. Distinguish supported guarantees from incidental implementation details.

Include concise examples illustrating an entry, syntax, or constraint. Examples belong here when they aid lookup. Link task workflows and learning journeys separately.

## Anti-Patterns

| Problem | Writing correction |
|---------|--------------------|
| A default or guarantee is guessed from its name | Verify it against the relevant contract or implementation |
| A lookup entry becomes a guided project | Retain the focused example and link the workflow |
| Every usage example is removed | Keep illustrations that clarify the documented entry |
| Recommendations obscure factual behavior | State the contract and link decision guidance separately |
