# Renaming Early When Words Collide

Use this reference when a field, message, or package name echoes a term the product already uses for a different concept.

## A Name That Is Fine Alone Can Still Collide

A name can read perfectly well in isolation and still be the wrong name, because the product already uses that word for something else. A session's source checkout being called `workspace` is a reasonable name on its own, until the product also has a hierarchy concept called `Workspace`; at that point every reader has to disambiguate which `workspace` a given line means, and the schema itself cannot tell them. Renaming the checkout concept to `CheckoutRef` removes the ambiguity entirely instead of asking every future reader to resolve it from context.

```protobuf
// Avoid: "workspace" already means something else in this product's hierarchy.
message StartSession {
  string workspace = 1;
}

// Prefer: a name with no collision anywhere else in the product's vocabulary.
message StartSession {
  CheckoutRef checkout_ref = 1;
}
```

## Check New Names Against the Product's Existing Vocabulary, Not Just the Local File

The collision rarely shows up by reading the file the new field lives in; it shows up by checking the new name against every other place the product already uses that word. Before naming a new message, field, or package, search the existing schemas (and the product's domain language more broadly) for the candidate name. A hit does not automatically rule the name out, but it does mean the two concepts need to be distinguishable at a glance, which a shared bare word cannot do.

## The Cheapest Moment to Rename Is Before Anything Depends on the Name

Once anything depends on the schema, a rename is a breaking change (the protobuf-evolve-schemas skill covers why a rename breaks JSON and generated source even when it is wire-compatible). Dependence is not only generated code: a client that reads the JSON form depends on the field names without ever seeing the schema. Before anything depends on the names, a rename costs nothing: it is a text edit in a file nobody reads yet.

This is one of the reasons a package still under active design is worth excluding from code generation entirely (for example, via `buf.gen.yaml` exclusions or simply not wiring the package into the build) until its shape has settled. Excluding codegen keeps generated bindings from depending on the names, but it does not prove nothing else does: confirm no service serves the package over JSON or binary and no client reads its payloads. Only then can every name change for free; the moment any consumer appears, every rename has a cost that scales with how many depend on it.

## Review Questions

- Does a new name reuse a word the product already assigns to a different concept elsewhere?
- Has the name been checked against the broader schema set, not just the file it lives in?
- Is the package still free of consumers on every surface (generated code, JSON, binary), meaning names in it can still be fixed for free?
