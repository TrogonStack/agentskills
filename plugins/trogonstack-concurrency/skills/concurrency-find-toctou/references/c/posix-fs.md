# POSIX Filesystem In C

Spells the filesystem primitives from [filesystem.md](../surfaces/filesystem.md).

## Exclusive Create

```c
int fd = open(path, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC, 0600);
if (fd < 0) {
    if (errno == EEXIST) { /* someone else created it */ }
    else return -1;
}
```

`mkdir` fails with `EEXIST` the same way; `access` or `stat` before either is the race.

## Open Then Verify

Verify the descriptor you hold, instead of `stat` then `open`.

```c
int fd = open(path, O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
if (fd < 0) return -1;
struct stat st;
if (fstat(fd, &st) < 0 || !S_ISREG(st.st_mode) || st.st_uid != getuid()) {
    close(fd);
    return -1;
}
```

## Untrusted Trees

Open the directory once and use `openat(dirfd, "child", O_NOFOLLOW | O_CLOEXEC)` for each child, so a swapped parent component cannot redirect the walk. On Linux, `openat2` with `RESOLVE_BENEATH` refuses every escape in one call.

## Temp File And Atomic Replace

`int fd = mkstemp(template);` where `template` ends in `XXXXXX` and lives in the target's directory. Write to that descriptor, `fsync(fd)`, `close(fd)`, then `rename(tmp, target)`. Building a name and calling `access` first is the race.

## Idempotent Delete

Call `unlink` and accept `ENOENT`.
