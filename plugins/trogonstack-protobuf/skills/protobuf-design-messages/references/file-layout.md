# File and Service Layout

Use this reference when creating a new `.proto` file, adding a `service`, naming RPC request and response messages, or deciding which file a definition belongs in.

## One Top-Level Definition Per File, Named After It

Give each top-level `message`, `enum`, and `service` its own file, and name the file after the definition in `lower_snake_case`. A reader looking for `DecideRequest` opens `decide_request.proto`; nobody has to grep to find where a type lives, and a diff that touches one type touches one file.

```txt
proto/acme/decider/v1/
├── decider_service.proto     # service DeciderService
├── decide_request.proto      # message DecideRequest
├── decide_response.proto     # message DecideResponse
├── decided_event.proto       # message DecidedEvent
└── faults.proto              # a closed family of fault messages kept together
```

A small family of types that only make sense together (a fault `oneof` and its arms, a value object and the enum it alone uses) may share a file named for the family. Keep that the exception: once a file holds unrelated definitions, its name stops telling the reader what is inside.

Google's [AIP-191](https://google.aip.dev/191) takes a different default and keeps a service's request and response messages in the same file as the service. Either layout is defensible; pick one per package and apply it to every file in it, so the file tree stays predictable.

## A Service Lives in `<name>_service.proto` and Is Named `<Name>Service`

The service name ends in `Service` (buf's `SERVICE_SUFFIX` lint rule, part of `STANDARD`), and its file is that name in `lower_snake_case`. The suffix keeps the service from colliding with the resource it serves: `Project` is the message, `ProjectService` is the API over it, and `project.proto` and `project_service.proto` sit side by side without ambiguity.

```protobuf
// decider_service.proto
service DeciderService {
  rpc Decide(DecideRequest) returns (DecideResponse);
}
```

## Every RPC Gets Its Own Request and Response

Name them after the method, `<Method>Request` and `<Method>Response` (buf's `RPC_REQUEST_STANDARD_NAME` and `RPC_RESPONSE_STANDARD_NAME`), and never share one between RPCs (`RPC_REQUEST_RESPONSE_UNIQUE`), even when today's fields happen to match. A shared request message couples the evolution of two methods: a field one method needs becomes a field the other must ignore forever. Avoid returning `google.protobuf.Empty` for the same reason; an empty `<Method>Response` costs nothing and leaves room to grow.

## The Directory Mirrors the Package

Every file in package `acme.billing.v1` lives in `acme/billing/v1/`, and every file in that directory declares that package (buf's `PACKAGE_DIRECTORY_MATCH` and `PACKAGE_SAME_DIRECTORY`). The last segment is the version (`PACKAGE_VERSION_SUFFIX`). Never name a file after the version (`v1.proto`); [AIP-191](https://google.aip.dev/191) calls out that it produces confusing imports in generated client libraries.

## Review Questions

- Does each file hold one top-level definition, named after it in `lower_snake_case`, or a deliberately grouped family named for the family?
- Does every `service` end in `Service` and live in `<name>_service.proto`?
- Does every RPC have its own `<Method>Request` and `<Method>Response`, shared with no other RPC?
- Does the directory path match the package, ending in the version segment, with no file named after the version?
