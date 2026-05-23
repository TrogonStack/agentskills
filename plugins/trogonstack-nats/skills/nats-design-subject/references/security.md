# NATS Accounts, Subject-Based Security, and Multi-Tenancy

This reference covers account-based tenant isolation, subject authorization, and security best practices for NATS subject hierarchies.

**Related references**: For subject hierarchy patterns see [patterns.md](patterns.md). For JetStream stream-level isolation see [jetstream.md](jetstream.md). For common security mistakes see [anti-patterns.md](anti-patterns.md).

## Account-First Rule

NATS Accounts are the native multi-tenancy boundary. Each account has its own subject namespace, users, account-scoped JetStream resources, and resource limits. Cross-account traffic should be explicit through exports/imports.

Use account-per-tenant when the system needs strict tenant isolation, account-scoped auth/JWTs, native quotas, tenant-local JetStream streams, or tenant-local KV buckets.

Use tenant prefixes in subjects only when:
- All tenants intentionally share one NATS account
- A platform/export subject needs tenant provenance after data leaves the tenant account
- A migration cannot introduce accounts yet

## Subject-Based Authorization Basics

NATS authorization works by allowing/denying subjects via permissions. Your subject hierarchy directly enables or blocks access.

### Permission Types

```nats
permissions:
  publish:
    allow: ["orders.>"]         # Can publish to any order subject
    deny: ["orders.cancelled"]  # Cannot publish to cancellations

  subscribe:
    allow: ["orders.>"]         # Can subscribe to any order subject
    deny: ["orders.*.admin"]    # Cannot subscribe to admin actions
```

### Wildcard Rules

- `>` matches any number of segments (multi-level)
- `*` matches exactly one segment
- Applied left-to-right

```nats
Subject: orders.created.us-west.order-123

Matches:
✓ orders.>                    (any order)
✓ orders.created.>            (any created order)
✓ orders.created.us-west.>    (any created in region)
✓ orders.*.us-west.>          (any action in region)
✗ orders.*.>                  (order action, but only one level)
```

---

## Pattern 1: Tenant Isolation with NATS Accounts (Default)

**Account and Subject Format**:
```
Account: {tenant}
Subject: {domain}.{action}.{scope}.{id}
```

**Examples**:
```
Account acme-corp:
orders.created.us-west.order-123
orders.shipped.us-west.order-456
payments.authorized.us-west.payment-101

Account startup-inc:
orders.created.eu-central.order-789
payments.authorized.eu-central.payment-101
```

**Authorization Configuration**:

```nats
# ACME Corp user in account acme-corp
user acme-admin {
  username: "admin@acme-corp.com"
  permissions {
    publish {
      allow: ["orders.>", "payments.>"]
    }
    subscribe {
      allow: ["orders.>", "payments.>"]
    }
  }
}

# StartUp Inc user in account startup-inc
user startup-admin {
  username: "admin@startup-inc.com"
  permissions {
    publish {
      allow: ["orders.>", "payments.>"]
    }
    subscribe {
      allow: ["orders.>", "payments.>"]
    }
  }
}

# Platform admin lives in a platform account and imports only approved tenant exports
user platform-admin {
  username: "platform-admin"
  permissions {
    publish {
      allow: ["monitoring.>", "analytics.>"]
    }
    subscribe {
      allow: ["monitoring.>", "analytics.>"]
    }
  }
}
```

**Effectiveness**: Excellent. Account-level isolation means tenant subjects are not globally visible.

**Pros**:
- Stronger isolation than subject prefixes
- Shorter tenant-local subjects
- Account-scoped users, JWTs, JetStream, KV, and quotas
- Built on NATS native permissions
- Cross-tenant traffic is opt-in through exports/imports

**Cons**:
- Requires account lifecycle management
- Cross-tenant analytics/federation needs explicit exports/imports
- Shared platform services must define import/export contracts

---

## Pattern 1b: Shared Account Tenant Prefix (Fallback)

**Use when**: Account-per-tenant is unavailable, or a shared/platform account needs tenant provenance in subjects.

**Subject Format**:
```
{tenant}.{domain}.{action}.{scope}.{id}
```

**Examples**:
```
acme-corp.orders.created.us-west.order-123
startup-inc.orders.created.eu-central.order-789
```

**Authorization**:
```nats
user acme-user {
  permissions {
    publish { allow: ["acme-corp.>"] }
    subscribe { allow: ["acme-corp.>"] }
  }
}
```

**Effectiveness**: Useful fallback, but weaker than accounts because all tenants still share one subject namespace.

---

## Pattern 2: Role-Based Access with Tiers

**Subject Format**:
```
{role}.{domain}.{action}.{scope}.{id}
```

**Examples**:
```
admin.orders.created.us-west.order-123
user.orders.status.us-west.order-456
service.orders.shipped.us-west.order-789
```

**Authorization**:
```nats
# Admin user (full access within connected account)
user acme-admin {
  permissions {
    publish {
      allow: ["admin.>", "user.>"]
    }
    subscribe {
      allow: ["admin.>", "user.>"]
    }
  }
}

# Regular user (limited to user tier in connected account)
user acme-user {
  permissions {
    publish {
      allow: ["user.orders.>"]
    }
    subscribe {
      allow: ["user.orders.>"]
    }
  }
}

# Internal service (full access in connected account)
user acme-service {
  permissions {
    publish {
      allow: ["service.>"]
    }
    subscribe {
      allow: [">"]
    }
  }
}
```

**Effectiveness**: ✓ Good. Role separation at subject level.

**Pros**:
- Fine-grained role control
- Internal services separate from user-facing
- Admin vs user operations clearly separated

**Cons**:
- More complex subject hierarchy (6-7 segments)
- Harder for subscribers to navigate (see Anti-Pattern 3 in anti-patterns.md)
- Often better modeled as account users and permissions without putting role in the subject

---

## Pattern 3: Separate Platform/Admin Subjects

**Subject Format**:
```
# Tenant account (normal operations)
{domain}.{action}.{scope}.{id}

# Platform account (monitoring/audit after import/export)
_admin.{operation}.{tenant}.{resource}.{details}
monitoring.{tenant}.{metric}
```

**Examples**:
```
# User-facing operations in tenant accounts
account acme-corp: orders.created.us-west.order-123
account startup-inc: orders.shipped.eu-central.order-456

# Platform operations in platform account
_admin.audit.acme-corp.orders.created.order-123
_admin.audit.startup-inc.orders.shipped.order-456

monitoring.acme-corp.event-count
monitoring.startup-inc.event-latency
```

**Authorization**:
```nats
# Tenant user in account acme-corp (normal operations only)
user acme-user {
  permissions {
    publish {
      allow: ["orders.>"]
    }
    subscribe {
      allow: ["orders.>"]
    }
  }
}

# Platform admin in platform account (admin and monitoring only)
user platform-admin {
  permissions {
    publish {
      allow: ["_admin.>", "monitoring.>"]
    }
    subscribe {
      allow: ["_admin.>", "monitoring.>"]
    }
  }
}

# System service in platform account (publishes audit logs and metrics)
user system-service {
  permissions {
    publish {
      allow: ["_admin.>", "monitoring.>"]
    }
    subscribe {
      allow: []
    }
  }
}
```

**Effectiveness**: ✓ Excellent. Clean separation of concerns.

**Pros**:
- Tenant subjects remain simple (4-5 segments)
- Admin operations completely separate
- Platform observability isolated
- Tenant accounts do not need broad platform-admin credentials

**Cons**:
- Two parallel subject hierarchies to maintain
- Exports/imports or mirror/source topology must be maintained

---

## Pattern 4: Cross-Tenant Analytics with Admin Aggregation

**Scenario**: Multi-tenant SaaS needs analytics across all tenants, but tenants can only see their own data.

**Subject Format**:
```
# Tenant account operations
{domain}.{action}.{scope}.{id}

# Platform account analytics aggregation (admin-only)
analytics.all-tenants.{metric}.{dimension}
analytics.{tenant}.{metric}.{dimension}
```

**Examples**:
```
# User operations in tenant accounts
account acme-corp: orders.created.us-west.order-123
account startup-inc: orders.created.eu-central.order-789

# Analytics (aggregated)
analytics.all-tenants.total-orders.created
analytics.all-tenants.avg-latency.orders
analytics.acme-corp.total-orders.created
analytics.startup-inc.total-orders.created

analytics.all-tenants.revenue.by-region
analytics.all-tenants.top-customers.by-spend
```

**Architecture**:
```
┌─────────────────────────────┐
│ Tenant Events               │
├─────────────────────────────┤
│ acme-corp account: orders.>│
│ startup account: orders.>  │
└────────────┬────────────────┘
             │ (read)
       ┌─────┴──────┐
       │ Aggregator │ (service account)
       └─────┬──────┘
             │ (write)
       ┌─────┴────────────────────┐
       │ Analytics Subjects       │
       ├──────────────────────────┤
       │ analytics.all-tenants.>  │
       │ analytics.{tenant}.>     │
       └──────────────────────────┘
```

**Authorization**:
```nats
# Aggregator service (reads tenant data, writes analytics)
user aggregator-service {
  permissions {
    publish {
      allow: ["analytics.>"]              # Write to analytics
    }
    subscribe {
      allow: ["orders.>"]                 # In each imported tenant stream scope
    }
  }
}

# Tenant user (can only see own analytics)
user acme-analyst {
  permissions {
    publish {
      deny: ["*"]                         # Cannot publish
    }
    subscribe {
      allow: ["analytics.acme-corp.>"]   # Only own tenant analytics
    }
  }
}

# Platform admin (sees all analytics)
user platform-admin {
  permissions {
    publish {
      deny: ["*"]
    }
    subscribe {
      allow: ["analytics.>"]             # All analytics including cross-tenant
    }
  }
}
```

**Effectiveness**: ✓ Excellent for analytics in multi-tenant systems.

**Pros**:
- Tenants see their analytics only
- Admin sees cross-tenant analytics
- Separates operational events from analytics
- Scales well (aggregator can be clustered)

**Cons**:
- Requires aggregator service
- Analytics is eventually consistent
- Add operational complexity

---

## Pattern 5: AI Agent Sandbox Isolation (Multi-Tenant)

**Scenario**: Multi-tenant platform with AI agents. Each tenant's agents must be isolated, but platform can monitor all.

**Subject Format**:
```
Tenant account:
agents.{action}.{agent-id}.{details}
agents.capabilities.{agent-type}
agents.collaborate.{session}.{agent-id}

Platform account:
monitoring.all-tenants.agent-health
monitoring.{tenant}.agent-metrics
```

**Examples**:
```
# Tenant ACME account
agents.task-assigned.agent-llm-1.task-abc
agents.task-completed.agent-llm-1.task-abc

# Tenant Startup account
agents.task-assigned.agent-code-1.task-xyz
agents.task-completed.agent-code-1.task-xyz

# Capability discovery and collaboration inside a tenant account
agents.capabilities.llm
agents.capabilities.code
agents.collaborate.session-123.agent-llm-1
agents.collaborate.session-123.agent-code-1

# Platform monitoring after explicit imports
monitoring.all-tenants.agent-health
monitoring.all-tenants.task-success-rate
monitoring.tenant-acme.agent-metrics
monitoring.tenant-acme.error-rate
```

**Authorization**:
```nats
# Agent in Tenant A account
user agent-tenant-acme {
  permissions {
    publish {
      allow: ["agents.task-assigned.>",
              "agents.task-completed.>",
              "agents.collaborate.>"]
    }
    subscribe {
      allow: ["agents.task-assigned.>",
              "agents.task-completed.>",
              "agents.capabilities.>",
              "agents.collaborate.>"]
    }
  }
}

# Agent in Tenant B account; same subject permissions, different account boundary
user agent-tenant-startup {
  permissions {
    publish {
      allow: ["agents.task-assigned.>",
              "agents.task-completed.>",
              "agents.collaborate.>"]
    }
    subscribe {
      allow: ["agents.task-assigned.>",
              "agents.task-completed.>",
              "agents.capabilities.>",
              "agents.collaborate.>"]
    }
  }
}

# Platform monitoring in platform account
user platform-monitor {
  permissions {
    publish {
      allow: ["monitoring.>"]
    }
    subscribe {
      allow: ["monitoring.>"]
    }
  }
}

# System orchestrator in one tenant account; cross-tenant orchestration uses exports/imports
user system-orchestrator {
  permissions {
    publish {
      allow: ["agents.>"]
    }
    subscribe {
      allow: ["agents.>"]
    }
  }
}
```

**Security Model**:
```
Tenant A Agents:
✓ Can publish/subscribe to: agents.> in tenant-a account
✗ Cannot see tenant-b account subjects
✗ Cannot see platform monitoring account unless explicitly imported

Tenant B Agents:
✓ Can publish/subscribe to: agents.> in tenant-b account
✗ Cannot see tenant-a account subjects
✗ Cannot see platform monitoring account unless explicitly imported

Platform Admin:
✓ Can see explicitly exported agent activity
✓ Can see metrics and health
✓ Cannot directly control agents (separate admin service)
```

**Effectiveness**: ✓ Excellent for agentic AI platforms.

**Pros**:
- Complete tenant isolation at account level
- Platform visibility without tenant access
- Inter-agent collaboration within tenant
- Scales to many agents and tenants

**Cons**:
- Requires account and export/import lifecycle management
- Audit trail needs platform account subjects

---

## Pattern 6: Environment Separation (Dev/Staging/Prod)

**Scenario**: Single NATS cluster serves dev, staging, and production. Complete isolation needed.

**Account and Subject Format**:
```
Account: {environment}.{tenant}
Subject: {domain}.{action}.{scope}.{id}
```

**Examples**:
```
account dev.acme-corp: orders.created.us-west.order-123
account staging.acme-corp: orders.created.us-west.order-456
account prod.acme-corp: orders.created.us-west.order-789

account dev.startup-inc: orders.created.eu-central.order-abc
account staging.startup-inc: orders.created.eu-central.order-def
account prod.startup-inc: orders.created.eu-central.order-ghi
```

**Authorization**:
```nats
# Dev team connects to dev accounts only
user dev-team {
  permissions {
    publish {
      allow: [">"]
    }
    subscribe {
      allow: [">"]
    }
  }
}

# Staging team (staging only)
user staging-team {
  permissions {
    publish {
      allow: [">"]
    }
    subscribe {
      allow: [">"]
    }
  }
}

# Production team (prod only)
user prod-team {
  permissions {
    publish {
      allow: [">"]
    }
    subscribe {
      allow: [">"]
    }
  }
}

# CI/CD gets explicit credentials/imports for each environment account it promotes
user ci-cd {
  permissions {
    publish {
      allow: [">"]
    }
    subscribe {
      allow: [">"]
    }
  }
}
```

**Effectiveness**: ✓ Good for environment isolation.

**Pros**:
- Single cluster, fully isolated environment accounts
- Account-based auth prevents cross-environment leakage
- Easy to promote from dev → staging → prod

**Cons**:
- Requires account lifecycle for each environment/tenant pair
- CI/CD needs carefully scoped credentials or imports

---

## Least Privilege Principle

### Example: Order Processing Service

**Over-Permissive** (❌):
```nats
user order-service {
  permissions {
    publish { allow: [">"] }            # Can publish ANYTHING
    subscribe { allow: [">"] }          # Can subscribe to ANYTHING
  }
}
```

**Least Privilege** (✓):
```nats
user order-service {
  permissions {
    publish {
      allow: [
        "orders.created.>",             # Create orders
        "orders.updated.>",             # Update orders
        "orders.cancelled.>",           # Cancel orders
        "inventory.reserved.>"          # Call inventory service
      ]
    }
    subscribe {
      allow: [
        "inventory.reserved.>",         # Listen for reservations
        "payments.authorized.>"         # Listen for payment confirmations
      ]
    }
  }
}
```

**Benefits**:
- Service cannot accidentally publish to wrong domain
- Service cannot snoop on unrelated topics
- Compromised service has limited blast radius
- Clear documentation of service dependencies

---

## Audit Trail Pattern

**Subject Format**:
```
_audit.{operation}.{user}.{timestamp}.{resource}
_audit.{domain}.{action}.{timestamp}.{details}
```

**Examples**:
```
_audit.publish.user@acme-corp.2026-01-24T12:34:56Z.orders.created
_audit.subscribe.admin@platform.2026-01-24T12:34:57Z.tenant-acme.orders
_audit.orders.created.2026-01-24T12:34:58Z.order-123
_audit.orders.deleted.2026-01-24T12:34:59Z.order-456
```

**Authorization**:
```nats
# Audit service (writes audit logs)
user audit-service {
  permissions {
    publish {
      allow: ["_audit.>"]
    }
    subscribe {
      deny: ["*"]
    }
  }
}

# Security team (reads audit logs only)
user security-team {
  permissions {
    publish {
      deny: ["*"]
    }
    subscribe {
      allow: ["_audit.>"]
    }
  }
}
```

---

## Security Checklist

When designing multi-tenant subject architecture:

- [ ] **Tenant Isolation**: Tenant account boundary prevents cross-tenant access?
- [ ] **Shared Account Justification**: Any tenant prefix fallback has an explicit reason?
- [ ] **Exports/Imports**: Cross-account traffic is explicit and least-privilege?
- [ ] **Least Privilege**: Each user/service has minimum permissions?
- [ ] **Admin Subjects**: Admin operations separate from user operations?
- [ ] **Audit Trail**: All sensitive operations logged to audit subjects?
- [ ] **Environment Separation**: Dev/staging/prod isolated by account or documented fallback?
- [ ] **Role-Based**: Roles clearly separated (user/service/admin)?
- [ ] **Denial Rules**: Explicit deny rules for sensitive subjects?
- [ ] **Monitoring**: Platform metrics isolated from tenant operations?
- [ ] **Credential Rotation**: Plan for credential management?
- [ ] **Documentation**: Permission matrix documented for audit?
