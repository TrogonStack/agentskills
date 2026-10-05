---
name: elixir-design-genserver
description: "Design or review Elixir GenServer modules. Decides whether a process is justified at all, detects mailbox queuing and serialization bottlenecks, shapes the client API, picks call vs cast, and places the server under supervision. Use when writing a new GenServer, reviewing an existing one, deciding where an actor belongs, or diagnosing a process that became a bottleneck. Do not use for: (1) designing full supervision trees across an application, (2) distributed Erlang or clustering, (3) Phoenix LiveView or Channel processes, (4) GenStage, Broadway, or Flow pipelines."
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Shell
---

# Design an Elixir GenServer

Put a process only where the runtime needs one, and know what it costs: every GenServer is a queue with a single worker.

## Core Principle

A process is the unit of concurrency, of serialization, and of failure, all at once. Use one to model a runtime concern (state shared across callers, an owned resource, an independent lifecycle, fault isolation). Never use one to organize code; modules and functions do that.

Wrapping an operation that needs none of those concerns in a GenServer does not add structure. It adds a queue that turns concurrent callers into sequential ones.

## Principles

Apply them in order. A design that fails an earlier principle makes the later ones moot. Each one names the references that show it in practice; read them when the situation matches, not up front.

### 1. A Process Must Own Something

A process earns its place by owning what cannot live in the caller: shared state that must change consistently, a resource with its own lifecycle, time, or a failure boundary. If it owns nothing, the caller can do the work itself, concurrently.

Read [references/process-justification.md](references/process-justification.md) when the decision is not obvious, or when reviewing code that uses GenServers as a service layer.

Read [references/resource-lifecycle-ownership.md](references/resource-lifecycle-ownership.md) when a resource must be released when some process exits, or when cleanup depends on callers calling `release` or on `terminate/2`.

Read [references/anti-pattern-database-gatekeeper.md](references/anti-pattern-database-gatekeeper.md) when a GenServer wraps database writes, or is justified as fault tolerance or as a way to avoid race conditions.

### 2. Every Process Is a Queue

One process handles one message at a time, so it caps throughput at `1 / handling_time` regardless of core count, and every caller waits behind every other. Know the arrival rate and handling time on the hot path before adding one, and remove the queue rather than tuning around it.

Read [references/mailbox-queuing.md](references/mailbox-queuing.md) when the server sits on a request path, receives casts from many producers, does I/O inside callbacks, or already shows timeouts or a growing `message_queue_len`. It links to an avoid/prefer example for each way of removing the queue.

### 3. The Process Is a Shell Around Meaning

The domain lives in a pure, deterministic core named after what it means. The GenServer only translates messages into calls on that core and owns what the core must not know about: the clock, timers, monitors, and other processes. Logic that needs no process stays testable and reusable without one.

Read [references/callback-patterns.md](references/callback-patterns.md) when writing or reviewing the module body.

Read [references/handle-info.md](references/handle-info.md) when the server sends itself messages, uses timers, monitors other processes, or receives task results.

Read [references/naming.md](references/naming.md) when naming the public module, the pure core, the process state, or the messages the GenServer exchanges.

### 4. Contracts Outlive Implementations

The client API is used by code you do not control and cannot change in lockstep. Shape what goes in and what comes out so it can grow without breaking callers.

Read [references/request-response.md](references/request-response.md) when designing or changing what a client function takes or returns, especially a reply that holds a list.

### 5. Crash Only When a Restart Helps

A restart starts from a clean state, which fixes corrupt state and transient faults and nothing else. Match the restart strategy to the lifecycle, and handle failures that persist across restarts instead of crash-looping.

Read [references/supervision-and-testing.md](references/supervision-and-testing.md) when wiring the child spec, handling cleanup, or writing tests.

## Worked Example

Read [references/example-chat-room.md](references/example-chat-room.md) to see every principle applied in one complete, tested GenServer.

## Reviewing an Existing GenServer

Read [references/review-checklist.md](references/review-checklist.md) when reviewing or auditing GenServer code. Each item is a symptom; a failing item is a question about the principle behind it, answered in the linked reference.
