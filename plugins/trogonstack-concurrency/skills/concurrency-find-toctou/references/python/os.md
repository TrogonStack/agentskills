# Python `os` And `tempfile`

Spells the filesystem primitives from [filesystem.md](../surfaces/filesystem.md).

## Exclusive Create

The `"x"` mode is `O_CREAT | O_EXCL`; `FileExistsError` is the answer.

```python
try:
    with open(path, "x") as f:
        f.write(data)
except FileExistsError:
    pass  # someone else created it
```

The lower-level form is `os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)`. `os.mkdir` raises `FileExistsError` the same way; `os.makedirs(path, exist_ok=True)` is the idempotent form. `os.path.exists` before either is the race.

## Atomic Replace

`tempfile.mkstemp` creates exclusively with a unique name in the target's directory; `os.replace` is the atomic rename that also overwrites on Windows.

```python
import os, tempfile

fd, tmp = tempfile.mkstemp(dir=os.path.dirname(target))
with os.fdopen(fd, "wb") as f:
    f.write(data)
    f.flush()
    os.fsync(f.fileno())
os.replace(tmp, target)
```

## Open Then Verify

```python
import os, stat

fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
st = os.fstat(fd)
if not stat.S_ISREG(st.st_mode) or st.st_uid != os.getuid():
    os.close(fd)
    raise PermissionError(path)
```

`os.stat(path)` followed by `open(path)` is the race.

## Untrusted Trees And Idempotent Delete

`os.open(child, flags, dir_fd=dirfd)` is `openat`; resolve each child relative to the directory descriptor instead of rebuilding the full path. `Path(path).unlink(missing_ok=True)` is the idempotent delete.
