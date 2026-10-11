# File and Service Layout

Use this reference when creating a new `.proto` file, adding a `service`, naming RPC request and response messages, or deciding which file a definition belongs in.

## Let `buf lint` Handle Naming and Directory Layout

Enable `STANDARD` (buf's default lint categories) and let it enforce the mechanics: `SERVICE_SUFFIX` (every service ends in `Service`), `RPC_REQUEST_STANDARD_NAME` and `RPC_RESPONSE_STANDARD_NAME` (every RPC has its own `<Method>Request`/`<Method>Response`), `RPC_REQUEST_RESPONSE_UNIQUE` (no RPC shares one with another), `FILE_LOWER_SNAKE_CASE`, and `PACKAGE_DIRECTORY_MATCH`/`PACKAGE_SAME_DIRECTORY`/`PACKAGE_VERSION_SUFFIX` (directory mirrors the package, ending in the version segment). Run `buf lint` instead of checking these by hand.

`RPC_REQUEST_RESPONSE_UNIQUE` and `RPC_RESPONSE_STANDARD_NAME` already rule out returning bare `google.protobuf.Empty`: a response type must be named `<Method>Response` and belong to one RPC alone, so every RPC gets a real, growable response message for free. The judgment call that remains is just not leaving that message artificially thin out of habit; it costs nothing to add fields later if it already exists.

## One Top-Level Definition Per File, Named After It

Give each top-level `message`, `enum`, and `service` its own file, named after the definition. A reader looking for `DecideRequest` opens `decide_request.proto`; nobody has to grep to find where a type lives, and a diff that touches one type touches one file.

```txt
proto/acme/decider/v1/
├── decider_service.proto     # service DeciderService
├── decide_request.proto      # message DecideRequest
├── decide_response.proto     # message DecideResponse
├── decided_event.proto       # message DecidedEvent
└── faults.proto              # a closed family of fault messages kept together
```

A small family of types that only make sense together (a fault `oneof` and its arms, a value object and the enum it alone uses) may share a file named for the family. Keep that the exception: once a file holds unrelated definitions, its name stops telling the reader what is inside.

Google's [AIP-191](https://google.aip.dev/191) takes a different default and keeps a service's request and response messages in the same file as the service. Either layout is defensible; pick one per package and apply it to every file in it, so the file tree stays predictable. `buf lint` enforces the naming either way; this choice is about where the file boundary falls, which the tool has no opinion on.

## Review Questions

- Does each file hold one top-level definition, or a deliberately grouped family named for the family, rather than an arbitrary mix?
- Was a layout (one-definition-per-file or AIP-191) chosen once and applied consistently across the package?
- Does `buf lint` pass with `STANDARD` enabled, so naming and directory layout are confirmed by the tool, not by eye?
