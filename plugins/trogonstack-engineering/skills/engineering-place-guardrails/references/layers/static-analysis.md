# Layer 2: Static Analysis

The wrong thing can be written, but a deterministic tool rejects it before merge. Paid in machine time on every change, never in attention.

## Moves

- **Compiler and type checker settings.** Strict mode, exhaustive matching, no implicit any, warnings as errors.
- **Lint rules, including custom ones.** Banned imports, banned calls, required patterns, naming. A rule phrased as "never X" or "always Y" is usually a lint.
- **Architecture tests.** Assert dependency direction between modules and layers.
- **Unit and integration tests.** For behavior types cannot express, tied to the specific mistake.
- **CI gates.** Formatting, schema compatibility, generated code up to date, and every check marked required. A check that can be skipped is prose with extra steps.

## Can This Layer Carry It?

Yes when a program can decide the rule from the source, the build, or a test run, without false positives that teach people to ignore it. If the check is noisy, the rule is probably a codebase move (layer 1) in disguise, or genuine judgment (layer 4 or 5).

## Backstop Role

Even when layer 1 carries the guardrail, a cheap lint here can keep the escape hatch from spreading (for example, flag uses of the explicit opt-out).
