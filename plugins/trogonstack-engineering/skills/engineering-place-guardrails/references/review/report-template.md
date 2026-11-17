# Report Template

One entry per mistake. Three worked entries follow, ending with one that correctly lands at the bottom.

## Handlers query the database directly

- Today: human review (flagged in review repeatedly, still slips in agent-written handlers)
- Layer chosen: codebase
- Why not higher: n/a, top layer
- Move: handlers receive only repository interfaces through their constructor; the database client is not exported from the persistence package
- Delete after: the AGENTS.md line "always go through the repository layer" and the matching review checklist item
- Follow-up: if the language cannot hide the client, add an import lint forbidding it in the handlers package

## Amounts mixed up between cents and dollars

- Today: prose ("amounts are in cents"), plus incidents
- Layer chosen: codebase
- Why not higher: n/a, top layer
- Move: a `Money` type carrying currency and minor units, built only from explicit factories, with no raw numeric arithmetic exposed
- Delete after: the sentence in the style guide and the review checklist item
- Follow-up: none

A lint flagging arithmetic on fields named `amount` was considered and rejected: noisy and incomplete, which is a sign the rule belongs higher.

## The new endpoint might be the wrong abstraction

- Today: human review
- Layer chosen: human review
- Why not higher: codebase, static analysis, and verification cannot decide whether a design is right; prose can state the team's design principles but cannot apply them
- Move: keep in review, and make sure the design principles exist in prose so the author applies them before review
- Delete after: none
- Follow-up: none
