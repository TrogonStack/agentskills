# Node `fs`

Spells the filesystem primitives from [filesystem.md](../surfaces/filesystem.md). Read the surface file first for the smell and the interleaver.

## Exclusive Create

The `wx` flag is `O_CREAT | O_EXCL`; `EEXIST` is the answer, not an error to swallow silently.

```ts
import { promises as fs } from "node:fs";

try {
  await fs.writeFile(path, data, { flag: "wx" });
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  // someone else created it
}
```

`fs.mkdir(path)` without `recursive` fails with `EEXIST` the same way; `fs.mkdir(path, { recursive: true })` is the idempotent form.

## Atomic Replace

Create a sibling temp name exclusively, write, `sync`, then `rename`. The temp file must sit in the target's directory so the rename stays on one filesystem.

```ts
import { randomUUID } from "node:crypto";

const tmp = `${target}.${process.pid}.${randomUUID()}`;
const handle = await fs.open(tmp, "wx");
await handle.writeFile(data);
await handle.sync();
await handle.close();
await fs.rename(tmp, target);
```

## Open Then Verify

Node exposes `O_NOFOLLOW` through `fs.constants`. Open with it, then `fstat` the handle instead of `stat` on the path.

```ts
const handle = await fs.open(path, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
const st = await handle.stat();
if (!st.isFile()) { await handle.close(); throw new Forbidden(); }
```

## Idempotent Delete And Private Temp Dirs

`fs.rm(path, { force: true })` swallows `ENOENT`. `fs.mkdtemp(prefix)` creates a private directory atomically; create files inside it rather than guessing free names in a shared directory.
