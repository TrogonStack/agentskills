# Filesystem Surfaces

A path is a name, not a file. Anything checked by name (`exists`, `stat`, `access`, `is_symlink`) can point at something else by the time the path is opened. The fix is to let the open itself carry the condition, then inspect the descriptor you actually got.

## Exists Then Create

Avoid:

```ts
if (!fs.existsSync(path)) {
  fs.writeFileSync(path, data);
}
```

Two processes both see "missing" and both write; the second silently overwrites the first. Prefer an exclusive create and treat the failure as the answer:

```ts
try {
  fs.writeFileSync(path, data, { flag: "wx" });
} catch (err) {
  if (err.code !== "EEXIST") throw err;
  // someone else created it; decide what that means here
}
```

The `wx` flag is `O_CREAT | O_EXCL`. Rust: `OpenOptions::new().write(true).create_new(true).open(path)`. Python: `open(path, "x")`. C: `open(path, O_WRONLY | O_CREAT | O_EXCL, mode)`.

The same applies to directories. `mkdir` already fails with `EEXIST`; checking first adds a race and removes nothing.

## Stat Then Open

Avoid:

```c
struct stat st;
if (stat(path, &st) == 0 && S_ISREG(st.st_mode) && st.st_uid == getuid()) {
  fd = open(path, O_RDONLY);
}
```

Between `stat` and `open` the path can be replaced by a symlink to a file you must not read. Prefer opening first and checking what you hold:

```c
fd = open(path, O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
if (fd < 0) return -1;
if (fstat(fd, &st) < 0 || !S_ISREG(st.st_mode) || st.st_uid != getuid()) {
  close(fd);
  return -1;
}
```

`fstat` describes the open descriptor, which cannot be swapped. `O_NOFOLLOW` rejects a symlink at the final component.

## Walking Untrusted Directory Trees

Each component of a path can be swapped while you walk it. Open the directory once and resolve children relative to that descriptor with `openat(dirfd, "child", O_NOFOLLOW | ...)` rather than rebuilding the full path per step. In Rust, `cap-std` and `rustix` expose `openat`; the standard library does not.

## Temp Files

Avoid building a temp name, checking it is free, and then creating it. Use a primitive that creates atomically: `mkstemp` in C, `tempfile.mkstemp` or `NamedTemporaryFile` in Python, `fs.mkdtemp` in Node (then create inside that private directory).

## Replace A File Atomically

Avoid writing directly into the target; readers can observe a partial file, and a crash leaves it truncated. Prefer write-to-temp, `fsync`, then `rename` onto the target. `rename` is atomic within one filesystem on POSIX, so readers see either the old file or the new one.

```ts
const tmp = `${target}.${process.pid}.${randomUUID()}`;
const fd = fs.openSync(tmp, "wx");
fs.writeSync(fd, data);
fs.fsyncSync(fd);
fs.closeSync(fd);
fs.renameSync(tmp, target);
```

## Check Then Delete Or Move

`if exists then unlink` and `if exists then rename` have the same shape. Call the operation and handle `ENOENT`. Node: `fs.rmSync(path, { force: true })` is the idempotent form.

## What The Finding Must Cite

Name the path-based check, the open or create that follows, and whether the directory is writable by anyone other than the process owner. A path in a private directory that only this process writes is still a bug if the process can run twice; say which is the case.
