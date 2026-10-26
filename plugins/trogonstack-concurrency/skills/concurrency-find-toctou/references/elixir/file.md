# Elixir `File`

Spells the filesystem primitives from [filesystem.md](../surfaces/filesystem.md).

## Exclusive Create

`:exclusive` is `O_CREAT | O_EXCL`; `{:error, :eexist}` is the answer.

```elixir
case File.open(path, [:write, :exclusive]) do
  {:ok, io} ->
    IO.binwrite(io, data)
    File.close(io)
  {:error, :eexist} ->
    :exists
end
```

`File.mkdir/1` returns `{:error, :eexist}` the same way; `File.mkdir_p/1` is the idempotent form. `File.exists?/1` before either is the race.

## Atomic Replace

Write to a sibling temp path created with `:exclusive`, then `File.rename/2` onto the target. Keep the temp file in the target's directory so the rename stays on one filesystem.

```elixir
tmp = "#{target}.#{System.unique_integer([:positive])}.tmp"
{:ok, io} = File.open(tmp, [:write, :exclusive])
IO.binwrite(io, data)
:ok = :file.sync(io)
File.close(io)
File.rename(tmp, target)
```

## Open Then Verify

`File` does not expose `O_NOFOLLOW`, so `File.lstat/1` followed by `File.open/2` is still two moments. When the directory is writable by other users, keep the file inside a directory only this process can write, or open it from a NIF that passes the flag.

## Idempotent Delete

`File.rm/1` returns `{:error, :enoent}` instead of raising; match on it rather than checking `File.exists?/1` first.
