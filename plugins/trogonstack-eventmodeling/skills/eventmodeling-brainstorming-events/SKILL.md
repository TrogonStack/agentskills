---
name: eventmodeling-brainstorming-events
description: >-
  Step 1 of Event Modeling - Brainstorm all domain events from requirements.
  Extract every state-changing event the system could have. Use when starting
  event modeling from requirements or a new domain. Do not use for: arranging
  events in sequence (use eventmodeling-plotting-events), designing commands
  or read models (use eventmodeling-designing-event-models), or when a complete
  event list already exists.
allowed-tools: AskUserQuestion, Write
---

# Brainstorming Events

## Interview Phase (Optional)

**When to Interview**: Skip if the user has provided detailed, well-documented requirements (written user stories, feature specs, business rules). Interview when requirements are vague, incomplete, or when domain expertise is uncertain.

**Interview Strategy**: Ensure requirements are complete and team understands domain well enough to brainstorm comprehensively. Identify hidden complexity areas upfront.

### Critical Questions

When requirements need clarification:

1. **Requirements Completeness** (Impact: Determines if brainstorm is likely to be exhaustive)
   - Question: "How complete are your requirements? Do you have: (A) Written user stories/specs, (B) Documented business rules, (C) Rough list, (D) Just verbal descriptions?"
   - Why it matters: Incomplete requirements cause missed events; complete requirements enable comprehensive brainstorm
   - Follow-up triggers: If (C) or (D) → probe for missing scenarios; if rules aren't documented → ask team to state them explicitly

2. **Domain Expertise & Familiarity** (Impact: Shapes who should participate and what guidance is needed)
   - Question: "Who understands this domain best? (A) Product/Domain expert leading brainstorm, (B) Engineering team figuring it out, (C) Mix of roles"
   - Why it matters: Domain expert participation dramatically improves event completeness; solo engineering leads to gaps
   - Follow-up triggers: If (B) → recommend inviting domain expert; if (C) → ask how decisions will be made

3. **Known Complexity Areas** (Impact: Determines where to focus brainstorming effort and depth)
   - Question: "Are there specific areas known to be complex or error-prone? (e.g., payment processing, state transitions, business rules)"
   - Why it matters: Complex areas often have hidden events; identifying them upfront ensures they're covered
   - Follow-up triggers: For each complex area → ask "What are the edge cases? What can go wrong?"

4. **Explicit Business Rules & Constraints** (Impact: Ensures no implicit assumptions; may reveal missing events)
   - Question: "What are critical business rules that govern this domain? (e.g., 'orders can only be cancelled within 24 hours', 'payments must be authorized before confirmation')"
   - Why it matters: Business rules often generate specific events; documenting them prevents overlooking state changes
   - Follow-up triggers: For each rule → ask "When this rule is violated, what event signals that?"

### Interview Flow

**Conditional Entry**:
```text
If user has provided:
  - Written requirements or user stories (not just verbal)
  - AND documented business rules or constraints
  - AND named domain experts who will participate

Then: Skip interview, proceed directly to brainstorming

Else: Conduct interview
```

**Phase 1: Requirements Assessment** (Questions 1-2)
- Gauge requirements completeness
- Confirm domain expertise available
- Adjust brainstorm scope accordingly

**Phase 2: Complexity Mapping** (Questions 3-4)
- Identify areas needing deep exploration
- Document rules that may generate events
- Plan brainstorm focus areas

### Capturing Interview Findings

Append findings to the project's event modeling file:

**File**: `.trogonai/interviews/[project-name]/EVENTMODELING.md`

Use Write tool to add/update this section:

```markdown
## 2. Brainstormed Events (eventmodeling-brainstorming-events)

### Requirements Assessment
[From Q1: Written requirements? Documented rules?]

### Domain Expertise
[From Q2: Who understands domain? Available for participation?]

### Role Catalog
#### Human Roles
- [Role 1]: [Description] → Actions: [list]
- [Role 2]: [Description] → Actions: [list]
#### System Actors
- [Actor 1]: [Description] → Triggers: [list]

### Event Streams (Stream Roots)
- Stream: [Name] (Identity: [id field])
  - Events: [Event1, Event2, Event3]
  - State changes: [State transitions]

### Business Rules & Constraints
[From Q3 & Q4]
- Rule 1: [Statement] → [Events it generates]
- Rule 2: [Statement] → [Events it generates]
- Constraint 1: [Limitation]

### Brainstorming Focus Areas
- [Focus area 1]
- [Focus area 2]
```

Update Interview Trail:
```markdown
| 2 | eventmodeling-brainstorming-events |  [today] | Event streams, business rules, constraints |
```

This section feeds into subsequent steps (plotting, storyboarding, etc.)

---

## Workshop Facilitation Guide

**Setting**: This is a collaborative brainstorming workshop. The facilitator guides participants to envision the system and extract events rapidly.

### The Brainstorming Flow

**Phase 1: Understand Goals** (5-10 min)
- Someone explains project goals
- What problem are we solving?
- Who are the users?
- What are key outcomes?

**Phase 2: Free Brainstorm** (15-20 min)
Facilitator asks:
> "What events could happen in this system? When something changes, what event occurs? Put down ANY event you think of."

Participants call out events (sticky notes or digital cards):
```text
"Customer places order"
"Order confirmed"
"Payment received"
"Inventory updated"
"Order shipped"
"Delivery confirmed"
"Return requested"
"Refund issued"
```

**Phase 3: Gentle Filtering** (10-15 min)
Facilitator introduces state-changing concept gently:

```text
Facilitator: "Now let's think about these events. An event is something that
CHANGED THE STATE of the system. It's something important that happened that
others need to know about.

Let me ask: Does 'Customer viewed the catalog' change anything?
Participants: "Well... no, they just looked."
Facilitator: "Right, so it's not an event. But if they SELECTED an item
               from catalog, that changes what's in their cart, so that's
               a state change. Call that 'ItemAddedToCart'."

Does 'Payment received' change something?
Participants: "Yes! Order goes from confirmed to paid."
Facilitator: "Exactly! That's an event—state changed."
```

**Key points to clarify**:
- "Customer logged in" → Maybe not state-changing (unless we track logins)
- "Customer created account" → State-changing event
- "System checked inventory" → Internal action, not state-changing
- "Inventory reserved" → State-changing event
- "Email sent" → Notification, not state-changing (unless we track email history)
- "Notification requested" → Could be state-changing if we track preferences

### Tips for Facilitators

**Make it conversational**:
- Don't say: "You identified a non-state-changing event"
- Say: "Interesting! Does that actually change anything in the system?"

**Use examples from their world**:
- If e-commerce: "Like if someone just browsed but didn't buy?"
- If banking: "Like if they just checked balance but didn't withdraw?"

**Don't be rigid**:
- If unsure whether something is state-changing, include it and refine later
- Some events seem minor now but matter in implementation
- Better to capture everything than miss important events

**Capture the "why"**:
- Don't just list events, capture context
- Why would this event matter?
- Who cares about it? (Other systems, views, business rules)

## Workflow

When given domain requirements, perform the following analysis:

### 1. Identify User Roles & Actors (MANDATORY)

Before brainstorming events, define **who** interacts with the system. Every event model needs an explicit role catalog — without it, downstream steps (storyboarding, commands, scenarios) lack clarity on who does what.

Identify all human roles and system actors:
- **Human roles**: Customer, Seller, Admin, Support Agent, Reviewer, etc.
- **System actors**: Payment Gateway, Inventory System, Notification Service, Scheduler, etc.

For each role/actor, document:
- **Name**: Use domain language (e.g., "Seller" not "User Type B")
- **Description**: What this role does in the domain (1-2 sentences)
- **Key actions**: What state changes can this role initiate?
- **Permissions boundary**: What can this role NOT do?

Present as a Role Catalog:

```text
## Role Catalog

### Human Roles

1. **Customer** - Description: End user who browses, purchases, and tracks orders
   - Key actions: Create order, confirm order, cancel order, submit review
   - Cannot: Manage inventory, process refunds, respond to reviews as seller

2. **Seller** - Description: Merchant who lists products and fulfills orders
   - Key actions: List product, confirm stock, respond to reviews, update pricing
   - Cannot: Place orders, approve own reviews, process payments

3. **Support Agent** - Description: Internal staff handling escalations and manual overrides
   - Key actions: Override order status, issue refunds, flag reviews
   - Cannot: Place orders on behalf of customers (unless impersonating)

### System Actors

1. **Payment Gateway** (external)
   - Triggers: Payment authorization, payment failure, refund confirmation
   - Communication: Webhooks

2. **Inventory System** (internal)
   - Triggers: Reserve inventory, release reservation
   - Communication: Event-driven
```

This catalog feeds directly into:
- **Step 3 (Storyboarding)**: One swimlane per human role
- **Step 4 (Inputs)**: Every command attributed to a specific role/actor
- **Step 7 (Scenarios)**: Scenarios reference roles by name
- **Step 8 (Completeness)**: Verify every role has at least one command path

### 2. Identify Event Streams (Stream Roots)
Identify the main entities that will have event streams. These are NOT DDD aggregates—they're simply the logical roots of events:
- User/Account
- Order
- Payment
- Shipment
- etc.

For each stream root, note:
- Name (use domain language, not technical terms)
- Identity key (what uniquely identifies instances: orderId, paymentId, customerId, etc.)
- What commands will affect it (we'll define state needs per command, not upfront)

### 3. Identify Business Processes
Map out critical workflows:
- What steps does a user go through?
- What are the decision points?
- Where do systems integrate?

### 4. Extract State Changes
For each process, identify what state changes occur:
- Customer places order → Order created
- Payment processed → Order confirmed
- Item shipped → Order status changed

These become your domain events.

### 5. Document Business Rules & Constraints
- What rules govern state transitions?
- What validations must pass?
- What are the invariants?

Examples:
- "Order can only be shipped if payment is confirmed"
- "Inventory must be reserved before order confirmation"
- "Customer can only cancel within 24 hours"

### 6. Create Analysis Document

Present findings in this structure (include facilitation notes for future workshops):

```markdown
## Workshop Notes

**Participants**: [List roles: PO, Dev, QA, Domain Expert]
**Duration**: [Time spent]
**Key facilitation moments**: [What helped clarify understanding?]

---

# Domain Analysis: [Domain Name]

## Role Catalog

### Human Roles
1. **[Role Name]**: [Description]
   - Key actions: [What this role can do]
   - Cannot: [Permission boundaries]

### System Actors
1. **[Actor Name]** ([internal/external]): [Description]
   - Triggers: [What events/commands it initiates]
   - Communication: [Webhooks / Event-driven / API]

## Event Streams (Stream Roots)
List each stream root and its identity:
- **Stream**: Review (Identity: reviewId)
- **Stream**: SellerResponse (Identity: responseId)
- **Stream**: Seller (Identity: sellerId)

Note: These are just the logical groupings of events. The STATE needed for each command will be determined later—not all stream attributes are needed for all commands.

## Business Processes
1. **Process Name**: Description
   - Actor: Who initiates?
   - Steps: 1. → 2. → 3.
   - Outcomes: What changes?

## Identified State Changes (Potential Events)
- [Stream] [Verb]: When? Why? (Use past tense: "ReviewPublished", "SellerResponseAdded")

## Business Rules & Constraints
- Rule 1: Condition and consequence
- Rule 2: Constraint description

## Questions for Domain Expert
- Any gaps in understanding?
- Unclear processes?
```

## Output Format
Present analysis in a clear markdown structure that can be directly used by the eventmodeling-designing-event-models skill.

## Core Architectural Rule

 **NEVER use DDD Aggregate pattern for state design** Every command handler must have its own minimal state projection derived from events. This is non-negotiable.

```text
 ANTI-PATTERN (Do NOT do this):
OrderAggregate { orderId, customerId, items[], total, status, paymentId, address, shippedAt, cancelledAt, ... }
Used by: ConfirmOrder, ShipOrder, CancelOrder, ApproveReturn
Problem: Loads unused data, couples unrelated commands, violates minimal state principle

 CORRECT PATTERN:
ConfirmOrderState { status, orderId }
ShipOrderState { status, orderId, paymentId }
CancelOrderState { status, orderId, createdAt }
Each command loads ONLY what it needs.
```

## Key Principles
- Use **domain language**, not technical terms
- Focus on **what** happens, not **how** it's implemented
- Identify **state changes** as events, not actions (gently!)
- Document **constraints** and **rules**
- Be **specific** with examples from the requirements
- **Collaborative Process**: This is a group brainstorm, not a solo analysis
- **Rapid Iteration**: Capture quickly, refine later
- **Gentle Filtering**: Introduce "state-changing events" concept conversationally, not as rigid rule
- **Event Sourcing Mindset**: Think in terms of immutable events and stream roots, NOT DDD aggregates. The stream root is just a logical grouping of events; state is minimal and command-specific.
- **Defer State Design**: Don't list all entity attributes upfront. In the model designer step, we'll define minimal state projections needed for each specific command.
- **Command State Isolation**: Each command handler has its own state shape. Different commands = different state interfaces.

## Best Practices for Requirements Analysis

### 1. Be Specific with Requirements
Provide concrete examples and clear scope:
- "Handle orders"
- "Orders have items, pricing, delivery address, and can be cancelled within 24 hours"

### 2. Use Domain Language
Use terms your business understands, not technical jargon:
- "obj1 references obj2"
- "Customer places Order with Products"

### 3. Document Constraints Explicitly
Make implicit rules explicit:
- "Process payments"
- "Authorize payment before marking order confirmed; refund if shipment fails"

### 4. Verify Role Catalog Completeness
Cross-check that the Role Catalog (from Step 1) covers all actors referenced in events and processes:
- "Orders can be created" (by whom?)
- "Customers can create orders; sellers can confirm stock; system can cancel if payment fails"

### 5. Cover Edge Cases
Include error and boundary conditions:
- "What happens if payment is declined?"
- "Can an order be modified after shipping starts?"
- "What triggers order cancellation?"

## Quality Checklist

- [ ] Every event is past tense and names a completed state change (e.g., `OrderPlaced`, not `PlaceOrder`)
- [ ] Role Catalog lists every actor (human roles and system processors) with distinct responsibilities
- [ ] Each event can be traced back to a specific actor in the Role Catalog
- [ ] No CRUD events (`UserUpdated`, `RecordDeleted`) — events describe business moments, not database operations
- [ ] All known error and boundary conditions have corresponding events
- [ ] Events group into at least one recognizable business process flow
- [ ] No overlapping event semantics — two events don't mean the same thing
