# Filesystem Surfaces

A path is a name, not a file. Anything checked by name (`exists`, `stat`, `access`, `is_symlink`) can point at something else by the time the path is opened. The fix is to let the open itself carry the condition, then inspect the descriptor you actually got.

## Exists Then Create

Avoid:

```
if not exists(path):
    write(path, data)
```

Two processes both see "missing" and both write; the second silently overwrites the first. Prefer an exclusive create and treat the failure as the answer:

```
try:
    create_exclusive(path, data)      # O_CREAT | O_EXCL
except AlreadyExists:
    decide what "someone else created it" means here
```

The same applies to directories. `mkdir` already fails with `EEXIST`; checking first adds a race and removes nothing.

## Stat Then Open

Avoid:

```
st = stat(path)
if is_regular(st) and owner(st) == me:
    fd = open(path)
```

Between `stat` and `open` the path can be replaced by a symlink to a file you must not read. Prefer opening first and checking what you hold:

```
fd = open(path, NOFOLLOW)
st = fstat(fd)
if not is_regular(st) or owner(st) != me:
    close(fd); fail
```

`fstat` describes the open descriptor, which cannot be swapped. `NOFOLLOW` rejects a symlink at the final component.

## Walking Untrusted Directory Trees

Each component of a path can be swapped while you walk it. Open the directory once and resolve children relative to that descriptor (`openat`) rather than rebuilding the full path per step.

## Temp Files

Avoid building a temp name, checking it is free, and then creating it. Use a primitive that creates atomically with a unique name (`mkstemp` and its library equivalents), or create inside a private directory made with `mkdtemp`.

## Replace A File Atomically

Avoid writing directly into the target; readers can observe a partial file, and a crash leaves it truncated. Prefer write-to-temp in the same directory, `fsync`, then `rename` onto the target. `rename` is atomic within one filesystem on POSIX, so readers see either the old file or the new one.

```
tmp = create_exclusive(target + "." + unique_suffix)
write(tmp, data); fsync(tmp); close(tmp)
rename(tmp, target)
```

## Check Then Delete Or Move

`if exists then unlink` and `if exists then rename` have the same shape. Call the operation and handle `ENOENT`.

## What The Finding Must Cite

Name the path-based check, the open or create that follows, and whether the directory is writable by anyone other than the process owner. A path in a private directory that only this process writes is still a bug if the process can run twice; say which is the case.

## Idiomatic Forms

Read [lang-typescript.md](lang-typescript.md), [lang-rust.md](lang-rust.md), [lang-elixir.md](lang-elixir.md), [lang-go.md](lang-go.md), [lang-python.md](lang-python.md), or [lang-c.md](lang-c.md) for the exclusive-create flag, the temp-file primitive, and the atomic rename in the language under review.
