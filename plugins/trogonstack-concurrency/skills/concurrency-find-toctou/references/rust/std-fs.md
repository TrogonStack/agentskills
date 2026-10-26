# Rust `std::fs`

Spells the filesystem primitives from [filesystem.md](../surfaces/filesystem.md) with the standard library and the `tempfile` crate.

## Exclusive Create

`create_new(true)` is `O_CREAT | O_EXCL`; `AlreadyExists` is the answer.

```rust
use std::fs::OpenOptions;
use std::io::ErrorKind;

match OpenOptions::new().write(true).create_new(true).open(&path) {
    Ok(file) => write_all(file, data)?,
    Err(e) if e.kind() == ErrorKind::AlreadyExists => { /* someone else created it */ }
    Err(e) => return Err(e.into()),
}
```

`std::fs::create_dir` fails with `AlreadyExists` the same way; `create_dir_all` is the idempotent form.

## Atomic Replace

Create the temp file in the target's directory so `persist` is a rename on the same filesystem.

```rust
use std::io::Write;
use tempfile::NamedTempFile;

let dir = target.parent().unwrap();
let mut tmp = NamedTempFile::new_in(dir)?;
tmp.write_all(data)?;
tmp.as_file().sync_all()?;
tmp.persist(&target)?;
```

## Open Then Verify

On Unix, `OpenOptionsExt::custom_flags(libc::O_NOFOLLOW)` rejects a symlink at the final component; then `file.metadata()` describes the descriptor you hold, not the path.

```rust
use std::os::unix::fs::OpenOptionsExt;

let file = OpenOptions::new().read(true).custom_flags(libc::O_NOFOLLOW).open(&path)?;
let meta = file.metadata()?;
if !meta.is_file() { return Err(Error::Forbidden); }
```

## Untrusted Trees And Idempotent Delete

The standard library has no `openat`; use `cap-std` or `rustix` to resolve children relative to an open directory. `std::fs::remove_file` returns `NotFound` rather than raising; match on it instead of checking `exists` first.
