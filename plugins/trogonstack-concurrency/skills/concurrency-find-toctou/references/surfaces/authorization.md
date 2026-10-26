# Authorization Surfaces

A permission check answers "may this principal do this, now". Any distance between that answer and the effect is a window in which the grant can be revoked, the ownership transferred, or the quota consumed by a sibling request. The check belongs at the point of effect, and ideally inside the same statement as the effect.

## Principles At Work

- [A read is a fact about the past](../principles/read-is-the-past.md): a grant loaded at login, at preview, or at enqueue time describes that moment.
- [The write must carry its condition](../principles/write-carries-condition.md): `WHERE owner_id = $u`, a membership join, a conditional quota decrement.
- [Only the owner of the state can decide](../principles/owner-decides.md): the worker, not the enqueuer, is at the point of effect, so the worker re-checks.
- [Idempotence absorbs what ordering cannot prevent](../principles/idempotence-absorbs.md): a replayed job must not re-apply an effect its first run already made.

## Check, Await, Act

Avoid:

```
if can(user, "edit", doc_id):
    rendered = render(body)          # slow, yields
    UPDATE documents SET body = rendered WHERE id = doc_id
```

During `render`, the document can be transferred to another owner or the user removed from the team. Prefer scoping the write by the authorization condition:

```sql
UPDATE documents
SET body = $1
WHERE id = $2
  AND owner_id = $3;
-- rowcount 0: not found or not owned, treat both as forbidden
```

When the rule is a membership rather than a column, join it into the same statement:

```sql
UPDATE documents d
SET body = $1
FROM team_members m
WHERE d.id = $2
  AND m.team_id = d.team_id
  AND m.user_id = $3
  AND m.role IN ('editor', 'owner');
```

## Preview Then Confirm

A two-step flow (one request shows the action and checks permission, a later request performs it) is two moments. The performing request must check again. The same holds for a confirmation dialog and for a wizard that checks on its first step and writes on its last.

## Queue Hop

A job enqueued after a permission check runs later, possibly much later, possibly on a replay. The worker must re-check at execution time against current state. If the worker cannot reach the authorization source, the job carries a short-lived signed capability (principal, action, resource, expiry) that the worker verifies, and expiry bounds the window.

## Rehydrated Sessions And Cached ACLs

A permission set loaded at login and cached in the session is a check made once and used for hours. Treat each privileged write as its own check against the source of truth, or cache with a TTL short enough that the domain accepts the window and the finding states that TTL.

## Quotas And Limits

"If count < limit then create" is a counter race wearing an authorization hat. Fold it into the write (see the cross-row invariants section of [database.md](database.md)) or into a conditional counter decrement, never into a separate read.

## What The Finding Must Cite

The check, the effect, what runs between them, and which actor can change the grant in that window (an admin, a transfer, a concurrent request on the same quota). State whether the effect's statement already encodes the condition; if it does, the pair is safe and the statement is the evidence.

## Library Files

The fix is the conditional statement from [database.md](database.md). The database library files show how the rowcount is read back: [node-postgres](../typescript/node-postgres.md), [prisma](../typescript/prisma.md), [drizzle](../typescript/drizzle.md), [sqlx](../rust/sqlx.md), [ecto](../elixir/ecto.md), [database-sql](../go/database-sql.md), [psycopg](../python/psycopg.md), [sqlalchemy](../python/sqlalchemy.md).
