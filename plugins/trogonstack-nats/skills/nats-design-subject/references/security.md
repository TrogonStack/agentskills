# NATS Subject-Based Security and Multi-Tenancy

This reference covers authorization patterns, tenant isolation, and security best practices using NATS subject hierarchies.

**Related references**: For subject hierarchy patterns see [patterns.md](patterns.md). For JetStream stream-level isolation see [jetstream.md](jetstream.md). For common security mistakes see [anti-patterns.md](anti-patterns.md).

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

## Pattern 1: Tenant Isolation with Prefix

**Subject Format**:
```
{tenant}.{domain}.{action}.{scope}.{id}
```

**Examples**:
```
acme-corp.orders.created.us-west.order-123
acme-corp.orders.shipped.us-west.order-456
startup-inc.orders.created.eu-central.order-789
startup-inc.payments.authorized.eu-central.payment-101
```

**Authorization Configuration**:

```nats
# ACME Corp user
user acme-admin {
  username: "admin@acme-corp.com"
  permissions {
    publish {
      allow: ["acme-corp.>"]      # Can only publish to own tenant
    }
    subscribe {
      allow: ["acme-corp.>"]      # Can only subscribe to own tenant
    }
  }
}

# StartUp Inc user
user startup-admin {
  username: "admin@startup-inc.com"
  permissions {
    publish {
      allow: ["startup-inc.>"]    # Can only publish to own tenant
    }
    subscribe {
      allow: ["startup-inc.>"]    # Can only subscribe to own tenant
    }
  }
}

# Platform admin (multi-tenant)
user platform-admin {
  username: "platform-admin"
  permissions {
    publish {
      allow: [">"]                # Can publish anywhere
    }
    subscribe {
      allow: [">"]                # Can subscribe anywhere
    }
  }
}
```

**Effectiveness**: ✓ Excellent. Complete tenant isolation with prefix-based auth.

**Pros**:
- Simple to understand
- Direct authorization mapping
- Built on NATS native permissions
- Easy to add/remove tenants

**Cons**:
- Admin operations need separate subjects (see Pattern 3)
- Cross-tenant analytics harder (see Pattern 3)

---

## Pattern 2: Role-Based Access with Tiers

**Subject Format**:
```
{tenant}.{role}.{domain}.{action}.{scope}.{id}
```

**Examples**:
```
acme-corp.admin.orders.created.us-west.order-123
acme-corp.user.orders.status.us-west.order-456
acme-corp.service.orders.shipped.us-west.order-789
```

**Authorization**:
```nats
# Admin user (full access within tenant)
user acme-admin {
  permissions {
    publish {
      allow: ["acme-corp.admin.>", "acme-corp.user.>"]
    }
    subscribe {
      allow: ["acme-corp.admin.>", "acme-corp.user.>"]
    }
  }
}

# Regular user (limited to user tier)
user acme-user {
  permissions {
    publish {
      allow: ["acme-corp.user.orders.>"]    # Only user-level order operations
    }
    subscribe {
      allow: ["acme-corp.user.orders.>"]
    }
  }
}

# Internal service (full access)
user acme-service {
  permissions {
    publish {
      allow: ["acme-corp.service.>"]
    }
    subscribe {
      allow: ["acme-corp.>"]                 # Subscribe to all tiers
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

---

## Pattern 3: Separate Admin Subjects for Multi-Tenancy

**Subject Format**:
```
# Tenant-scoped (normal operations)
{tenant}.{domain}.{action}.{scope}.{id}

# Admin/monitoring (platform-wide, separate root)
_admin.{operation}.{tenant}.{resource}.{details}
platform.monitoring.{tenant}.{metric}
```

**Examples**:
```
# User-facing operations
acme-corp.orders.created.us-west.order-123
startup-inc.orders.shipped.eu-central.order-456

# Admin operations (monitoring, platform ops)
_admin.audit.acme-corp.orders.created.order-123
_admin.audit.startup-inc.orders.shipped.order-456

platform.monitoring.acme-corp.event-count
platform.monitoring.startup-inc.event-latency
```

**Authorization**:
```nats
# Tenant user (normal operations only)
user acme-user {
  permissions {
    publish {
      allow: ["acme-corp.>"]
    }
    subscribe {
      allow: ["acme-corp.>"]
    }
  }
}

# Platform admin (admin and monitoring only)
user platform-admin {
  permissions {
    publish {
      allow: ["_admin.>", "platform.monitoring.>"]
    }
    subscribe {
      allow: ["_admin.>", "platform.monitoring.>"]
    }
  }
}

# System service (publishes audit logs and metrics)
user system-service {
  permissions {
    publish {
      allow: ["_admin.>", "platform.monitoring.>"]
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

**Cons**:
- Two parallel subject hierarchies to maintain
- Audit trails in separate subjects from operations

---

## Pattern 4: Cross-Tenant Analytics with Admin Aggregation

**Scenario**: Multi-tenant SaaS needs analytics across all tenants, but tenants can only see their own data.

**Subject Format**:
```
# Tenant-specific operations
{tenant}.{domain}.{action}.{scope}.{id}

# Analytics aggregation (admin-only)
analytics.all-tenants.{metric}.{dimension}
analytics.{tenant}.{metric}.{dimension}
```

**Examples**:
```
# User operations (tenant-isolated)
acme-corp.orders.created.us-west.order-123
startup-inc.orders.created.eu-central.order-789

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
│ acme-corp.orders.created.>  │
│ startup-inc.orders.created >│
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
      allow: ["acme-corp.orders.>",
              "startup-inc.orders.>",
              "other-tenant.orders.>"]   # Read all tenant order events
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
agents.{action}.{tenant}.{agent-id}.{details}
agents.capabilities.{tenant}.{agent-type}
agents.collaborate.{tenant}.{session}.{agent-id}
platform.monitoring.all-tenants.agent-health
platform.monitoring.{tenant}.agent-metrics
```

**Examples**:
```
# Agent operations (tenant-isolated)
agents.task-assigned.tenant-acme.agent-llm-1.task-abc
agents.task-completed.tenant-acme.agent-llm-1.task-abc
agents.task-assigned.tenant-startup.agent-code-1.task-xyz
agents.task-completed.tenant-startup.agent-code-1.task-xyz

# Capability discovery (tenant-scoped)
agents.capabilities.tenant-acme.llm
agents.capabilities.tenant-acme.code
agents.capabilities.tenant-startup.llm

# Agent collaboration (within tenant)
agents.collaborate.tenant-acme.session-123.agent-llm-1
agents.collaborate.tenant-acme.session-123.agent-code-1

# Platform monitoring (admin only)
platform.monitoring.all-tenants.agent-health
platform.monitoring.all-tenants.task-success-rate
platform.monitoring.tenant-acme.agent-metrics
platform.monitoring.tenant-acme.error-rate
```

**Authorization**:
```nats
# Agent in Tenant A (complete isolation)
user agent-tenant-acme {
  permissions {
    publish {
      allow: ["agents.task-assigned.tenant-acme.>",
              "agents.task-completed.tenant-acme.>",
              "agents.collaborate.tenant-acme.>"]
    }
    subscribe {
      allow: ["agents.task-assigned.tenant-acme.>",
              "agents.task-completed.tenant-acme.>",
              "agents.capabilities.tenant-acme.>",
              "agents.collaborate.tenant-acme.>"]
    }
  }
}

# Agent in Tenant B (isolated from Tenant A)
user agent-tenant-startup {
  permissions {
    publish {
      allow: ["agents.task-assigned.tenant-startup.>",
              "agents.task-completed.tenant-startup.>",
              "agents.collaborate.tenant-startup.>"]
    }
    subscribe {
      allow: ["agents.task-assigned.tenant-startup.>",
              "agents.task-completed.tenant-startup.>",
              "agents.capabilities.tenant-startup.>",
              "agents.collaborate.tenant-startup.>"]
    }
  }
}

# Platform monitoring (admin)
user platform-monitor {
  permissions {
    publish {
      allow: ["platform.monitoring.>"]
    }
    subscribe {
      allow: ["platform.monitoring.>"]
    }
  }
}

# System orchestrator (manages agents)
user system-orchestrator {
  permissions {
    publish {
      allow: ["agents.>", "platform.monitoring.>"]
    }
    subscribe {
      allow: ["agents.>", "platform.monitoring.>"]
    }
  }
}
```

**Security Model**:
```
Tenant A Agents:
✓ Can publish/subscribe to: agents.*.tenant-acme.>
✗ Cannot see: agents.*.tenant-startup.>
✗ Cannot see: platform.monitoring.>

Tenant B Agents:
✓ Can publish/subscribe to: agents.*.tenant-startup.>
✗ Cannot see: agents.*.tenant-acme.>
✗ Cannot see: platform.monitoring.>

Platform Admin:
✓ Can see all agent activity
✓ Can see metrics and health
✓ Cannot directly control agents (separate admin service)
```

**Effectiveness**: ✓ Excellent for agentic AI platforms.

**Pros**:
- Complete tenant isolation at subject level
- Platform visibility without tenant access
- Inter-agent collaboration within tenant
- Scales to many agents and tenants

**Cons**:
- More complex subject hierarchy
- Requires careful permission management
- Audit trail needs separate subjects

---

## Pattern 6: Environment Separation (Dev/Staging/Prod)

**Scenario**: Single NATS cluster serves dev, staging, and production. Complete isolation needed.

**Subject Format**:
```
{environment}.{tenant}.{domain}.{action}.{scope}.{id}
```

**Examples**:
```
dev.acme-corp.orders.created.us-west.order-123
staging.acme-corp.orders.created.us-west.order-456
prod.acme-corp.orders.created.us-west.order-789

dev.startup-inc.orders.created.eu-central.order-abc
staging.startup-inc.orders.created.eu-central.order-def
prod.startup-inc.orders.created.eu-central.order-ghi
```

**Authorization**:
```nats
# Dev team (dev environment only)
user dev-team {
  permissions {
    publish {
      allow: ["dev.>"]
    }
    subscribe {
      allow: ["dev.>"]
    }
  }
}

# Staging team (staging only)
user staging-team {
  permissions {
    publish {
      allow: ["staging.>"]
    }
    subscribe {
      allow: ["staging.>"]
    }
  }
}

# Production team (prod only)
user prod-team {
  permissions {
    publish {
      allow: ["prod.>"]
    }
    subscribe {
      allow: ["prod.>"]
    }
  }
}

# CI/CD (can promote between environments)
user ci-cd {
  permissions {
    publish {
      allow: ["dev.>", "staging.>", "prod.>"]
    }
    subscribe {
      allow: ["dev.>", "staging.>", "prod.>"]
    }
  }
}
```

**Effectiveness**: ✓ Good for environment isolation.

**Pros**:
- Single cluster, fully isolated environments
- Subject-based auth prevents cross-environment leakage
- Easy to promote from dev → staging → prod

**Cons**:
- Adds subject layer (more segments)
- Complex permissions for multi-role users

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

- [ ] **Tenant Isolation**: Tenant prefix prevents cross-tenant access?
- [ ] **Least Privilege**: Each user/service has minimum permissions?
- [ ] **Admin Subjects**: Admin operations separate from user operations?
- [ ] **Audit Trail**: All sensitive operations logged to audit subjects?
- [ ] **Environment Separation**: Dev/staging/prod isolated by subject?
- [ ] **Role-Based**: Roles clearly separated (user/service/admin)?
- [ ] **Denial Rules**: Explicit deny rules for sensitive subjects?
- [ ] **Monitoring**: Platform metrics isolated from tenant operations?
- [ ] **Credential Rotation**: Plan for credential management?
- [ ] **Documentation**: Permission matrix documented for audit?

