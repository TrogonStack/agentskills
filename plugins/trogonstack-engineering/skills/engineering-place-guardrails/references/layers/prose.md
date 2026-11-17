# Layer 4: Prose

A reader, human or agent, is asked to remember and comply. Paid on every read: context, attention, and drift as the code changes underneath it. Compliance is probabilistic.

## What Belongs Here

- **Intent and priorities.** Why the system is shaped this way, what to optimize for when goals conflict.
- **Judgment calls.** When to choose A over B, and the signals that tell them apart.
- **Navigation.** Where things live, which tool or command to use for what.
- **Pointers upward.** "Run `make check` before pushing" beats restating everything it checks.

## What Does Not

- Anything phrased "never X" or "always Y" that a program can decide: that is a lint or a type.
- Rules restating what a tool already enforces: delete them.
- A second, louder version of a rule that is already being ignored: the rule is in the wrong layer.

## Test For A Prose Rule

Ask: could a program decide whether this rule was followed, from the code alone? If yes, it is a promotion candidate. If deciding needs context about goals, users, or trade-offs, it belongs here.
