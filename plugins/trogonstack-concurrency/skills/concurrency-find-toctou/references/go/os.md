# Go `os`

Spells the filesystem primitives from [filesystem.md](../surfaces/filesystem.md).

## Exclusive Create

```go
f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
if errors.Is(err, fs.ErrExist) {
    // someone else created it
} else if err != nil {
    return err
}
```

`os.Mkdir` fails with `fs.ErrExist` the same way; `os.MkdirAll` is the idempotent form. `os.Stat` before either is the race.

## Atomic Replace

```go
tmp, err := os.CreateTemp(filepath.Dir(target), ".tmp-*")
if err != nil { return err }
defer os.Remove(tmp.Name())
if _, err := tmp.Write(data); err != nil { return err }
if err := tmp.Sync(); err != nil { return err }
if err := tmp.Close(); err != nil { return err }
return os.Rename(tmp.Name(), target)
```

`os.CreateTemp` creates exclusively with a unique name; building a name and checking `os.Stat` first is the race.

## Open Then Verify

`os.OpenFile` with `syscall.O_NOFOLLOW` rejects a symlink at the final component; then `f.Stat()` describes the descriptor, not the path.

```go
f, err := os.OpenFile(path, os.O_RDONLY|syscall.O_NOFOLLOW, 0)
if err != nil { return err }
st, err := f.Stat()
if err != nil || !st.Mode().IsRegular() { f.Close(); return ErrForbidden }
```

## Untrusted Trees And Idempotent Delete

`os.Root` (Go 1.24+) resolves paths relative to an opened directory and refuses escapes through symlinks, which is the `openat` discipline. `os.Remove` then `errors.Is(err, fs.ErrNotExist)` is the idempotent delete.
