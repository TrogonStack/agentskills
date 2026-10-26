# C

How each primitive from the surface references is spelled in C on POSIX. Read the surface reference first for the smell and the interleaver; this file only gives the idiomatic form.

## Filesystem

Exclusive create:

```c
int fd = open(path, O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC, 0600);
if (fd < 0) {
    if (errno == EEXIST) { /* someone else created it */ }
    else return -1;
}
```

Open then verify the descriptor you hold, instead of `stat` then `open`:

```c
int fd = open(path, O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
if (fd < 0) return -1;
struct stat st;
if (fstat(fd, &st) < 0 || !S_ISREG(st.st_mode) || st.st_uid != getuid()) {
    close(fd);
    return -1;
}
```

Walking untrusted trees: open the directory once and use `openat(dirfd, "child", O_NOFOLLOW | O_CLOEXEC)` for each child, so a swapped parent component cannot redirect the walk.

Temp file: `int fd = mkstemp(template);` where `template` ends in `XXXXXX` and lives in the target's directory. Atomic replace: write to that temp file, `fsync(fd)`, `close(fd)`, then `rename(tmp, target)`.

Idempotent delete: call `unlink` and accept `ENOENT`.

## Async And In-Process

Scalar compare-and-swap with C11 atomics:

```c
#include <stdatomic.h>

_Atomic uint64_t counter;

uint64_t cur = atomic_load(&counter);
for (;;) {
    if (cur >= limit) return -1;
    if (atomic_compare_exchange_weak(&counter, &cur, cur + 1)) break;
}
```

`atomic_compare_exchange_weak` reloads `cur` with the observed value on failure, which is what the loop needs. GCC and Clang builtins: `__atomic_compare_exchange_n(&counter, &cur, cur + 1, true, __ATOMIC_ACQ_REL, __ATOMIC_ACQUIRE)`.

A `pthread_mutex_t` held across both the check and the write is correct when every writer to that state takes the same mutex; a check outside the mutex followed by a locked write is the race.
