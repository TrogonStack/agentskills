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

## Workflow

### 1. Justify the Process

Name what the process owns. If the answer is "the functions in this module", or the work is a DB query, HTTP request, or pure computation the caller could run itself, do not write a GenServer.

Read [references/process-justification.md](references/process-justification.md) when the decision is not obvious, or when reviewing code that uses GenServers as a service layer.

### 2. Check the Queue

Estimate arrival rate and handling time on the hot path. A single server tops out at `1 / handling_time` messages per second regardless of core count. If callers can outpace it, the mailbox grows and latency grows with it.

Read [references/mailbox-queuing.md](references/mailbox-queuing.md) when the server sits on a request path, receives casts from many producers, does I/O inside callbacks, or already shows timeouts or a growing `message_queue_len`. It links to an avoid/prefer example for each way of removing the queue.

### 3. Shape the Module

Client API wraps every `call`/`cast`, callbacks delegate to a pure core, `call` is the default, `init/1` stays fast, and `handle_info/2` has a catch-all.

Read [references/callback-patterns.md](references/callback-patterns.md) when writing or reviewing the module body.

Read [references/handle-info.md](references/handle-info.md) when the server sends itself messages, uses timers, monitors other processes, or receives task results.

Read [references/naming.md](references/naming.md) when naming the public module, the pure core, the process state, or the Request/Response structs the GenServer exchanges.

### 4. Supervise and Test

Pick a restart strategy that matches the lifecycle, and test the pure core without processes.

Read [references/supervision-and-testing.md](references/supervision-and-testing.md) when wiring the child spec, handling cleanup, or writing tests.

## Reviewing an Existing GenServer

Read [references/review-checklist.md](references/review-checklist.md) when reviewing or auditing GenServer code. Each section links to the reference that explains a failing item.
