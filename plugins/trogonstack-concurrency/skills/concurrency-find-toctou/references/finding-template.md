# Finding Template

One finding per check-then-act pair. The format forces the reviewer to name the interleaver and the consequence; a finding that cannot name both is not yet a finding.

## Format

```
### <short title>

- Location: <file:line> (check) and <file:line> (act)
- Check: <what is read and the condition on it>
- Act: <what is written>
- Window: <what runs between them: an await, a network call, a queue hop, a second request>
- Interleaver: <who else can run between the check and the act, and how>
- Consequence: <the concrete wrong outcome: duplicate row, negative balance, write by a revoked user>
- Fix: <the atomic primitive, and the code shape that uses it>
- Residual: <what the fix still does not cover, or "none">
```

Pairs judged safe go in a separate list using the format in [false-positives.md](false-positives.md).

## Worked Example

The code under review:

```ts
// src/billing/redeem.ts
export async function redeem(userId: string, code: string) {
  const coupon = await db.oneOrNone(
    "SELECT id, uses, max_uses FROM coupons WHERE code = $1",
    [code],
  );
  if (!coupon) throw new NotFound();
  if (coupon.uses >= coupon.max_uses) throw new Exhausted();        // line 9

  await payments.applyDiscount(userId, coupon.id);                   // line 11

  await db.none(
    "UPDATE coupons SET uses = uses + 1 WHERE id = $1",
    [coupon.id],
  );                                                                 // line 16
}
```

The finding:

```
### Coupon can be redeemed past max_uses

- Location: src/billing/redeem.ts:9 (check) and src/billing/redeem.ts:16 (act)
- Check: SELECT uses, max_uses for the code; proceed only if uses < max_uses
- Act: UPDATE uses = uses + 1, after a discount has already been applied
- Window: the SELECT, the applyDiscount network call, then the UPDATE; tens to hundreds of milliseconds
- Interleaver: any concurrent redeem of the same code, including the same user double-submitting the form or retrying a timed-out request. Each reads uses = max_uses - 1, passes the check, applies a discount, and increments.
- Consequence: N concurrent requests at the last use all receive the discount; uses ends at max_uses + N - 1. Money is given away and the stored count no longer matches reality.
- Fix: claim the use before applying the discount, with the condition inside the statement:

    UPDATE coupons
    SET uses = uses + 1
    WHERE id = $1 AND uses < max_uses
    RETURNING uses;

  Zero rows means exhausted; throw before touching payments. Add CHECK (uses <= max_uses) as a backstop. The order becomes claim, then discount, then (on discount failure) a compensating UPDATE uses = uses - 1.
- Residual: a crash between the claim and the discount leaves a consumed use with no discount applied. Acceptable if the compensation runs from a reconciliation job; otherwise wrap the claim and a pending-discount row in one transaction and apply the discount from an outbox.
```

What makes this finding complete: the interleaver names a realistic actor (double submit, retry), the consequence is stated in domain terms (money, wrong count), the fix is a conditional write at the store that owns the count, and the residual is honest about what the fix moves rather than removes. The example is TypeScript; the finding format is the same for every language, and the fix is spelled for the driver in use by the matching language reference.
