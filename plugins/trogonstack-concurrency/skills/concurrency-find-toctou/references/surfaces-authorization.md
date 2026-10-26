# Authorization Surfaces

A permission check answers "may this principal do this, now". Any distance between that answer and the effect is a window in which the grant can be revoked, the ownership transferred, or the quota consumed by a sibling request. The check belongs at the point of effect, and ideally inside the same statement as the effect.

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

"If count < limit then create" is a counter race wearing an authorization hat. Fold it into the write (see the cross-row invariants section of [surfaces-database.md](surfaces-database.md)) or into a conditional counter decrement, never into a separate read.

## What The Finding Must Cite

The check, the effect, what runs between them, and which actor can change the grant in that window (an admin, a transfer, a concurrent request on the same quota). State whether the effect's statement already encodes the condition; if it does, the pair is safe and the statement is the evidence.

## Idiomatic Forms

The fix is the conditional statement in [surfaces-database.md](surfaces-database.md); read the language file for the driver or ORM under review to see how the rowcount is read back.
