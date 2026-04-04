---
name: eventmodeling-identifying-outputs
description: >-
  Step 5 of Event Modeling - Identify Outputs/Read Models from events. Show
  what data flows back to UI and Processors. Use after defining inputs. Do not
  use for: identifying commands or inputs (use eventmodeling-identifying-inputs)
  or verifying field completeness (use eventmodeling-checking-completeness).
allowed-tools: AskUserQuestion, Write
---

# Identifying Outputs

## Interview Phase (Optional)

**When to Interview**: Skip if the user has clearly identified: read model queries needed by UI, processor needs, and refresh patterns. Interview when unclear which data queries are critical or how frequently they're accessed.

**Interview Strategy**: Establish query patterns and identify any calculations before designing read models. The most common architecture error at this step is modeling recalculated state as an event — identifying calculated fields upfront prevents that anti-pattern.

### Critical Questions

1. **Query Patterns** (Impact: Determines which read models are needed and their update frequency)
   - Question: "What data do users/processors need to query? (A) Real-time (sub-second), (B) Near-real-time (seconds), (C) Periodic (minutes/hours)?"
   - Why it matters: Query frequency drives read model design and caching strategy
   - Follow-up triggers: If (A) → ask which specific screens or processors require sub-second reads; these need dedicated, highly optimized read models

2. **Event vs Read Model Clarification** (Impact: Ensures we don't model calculations as events)
   - Question: "Are there calculated/aggregated fields? (e.g., average rating, total sales, inventory count) - These are read models, not events."
   - Why it matters: Common mistake to model calculations as events; identifying them upfront prevents architecture errors
   - Follow-up triggers: For each calculated field mentioned → confirm "This recalculates as source data changes, so it belongs in a read model projection — does that match your expectation?"

### Interview Flow

**Conditional Entry**:
```
If user has provided:
  - UI screens with data needs mapped to event sources
  - AND processor query needs documented
  - AND calculated/aggregated fields identified as read models (not events)

Then: Skip interview, proceed directly to read model design

Else: Conduct interview
```

**Phase 1: Query Pattern Mapping** (Question 1)
- Identify which UI screens and processors need data
- Establish freshness requirements per consumer
- Determine if any queries require real-time consistency

**Phase 2: Calculation Detection** (Question 2)
- Surface any aggregated or computed values
- Confirm they are projections, not events
- Prevent the calculation-as-event anti-pattern before design begins

### Capturing Interview Findings

Append findings to the project's event modeling file:

**File**: `.trogonai/interviews/[project-name]/EVENTMODELING.md`

Use Write tool to add/update this section:

```markdown
## 5. Identifying Outputs (eventmodeling-identifying-outputs)

### Query Patterns
[From Q1: Which consumers need what freshness? Real-time vs. periodic?]

### Calculated Fields Identified
[From Q2: Which fields are aggregated/calculated? Confirmed as read models?]

### Read Model Summary
- Real-time read models: [list]
- Near-real-time read models: [list]
- Calculation-as-event anti-patterns caught: [list or "None"]
```

Update Interview Trail:
```markdown
| 5 | eventmodeling-identifying-outputs | Done | Read model catalog, query patterns, calculation classification |
```

---

## CRITICAL: Events vs Read Models

**This is the most important distinction in event sourcing.** Many architectures fail because this line gets blurred.

### Events = Immutable Domain Facts
Things that actually happened in the domain. Once created, they never change:
- CustomerCreated (a customer actually signed up)
- OrderPlaced (someone actually placed an order)
- PaymentAuthorized (payment gateway actually authorized)
- OrderShipped (fulfillment actually shipped the order)

**Characteristics**:
- Represents an action someone took
- Immutable once recorded
- Can be replayed to rebuild state
- Provides audit trail
- Independent of other events

### Read Models = Derived Projections
Optimized views calculated FROM events. They recalculate multiple times:
- CustomerDashboard (projects current customer data)
- OrderStatusView (projects order state)
- InventoryLevelView (projects available stock from receipt/sale events)
- InventoryLevel (projects available stock)

**Characteristics**:
- Calculated/aggregated state
- Recalculates when source events change
- Derived from other events
- Query optimization
- Can be regenerated from events

### The Test: Is It an Event or Read Model?

Ask these questions in order:

| Question | Answer | Type | Example |
|----------|--------|------|---------|
| Did an actor perform an action? | YES | EVENT | Customer confirmed the order |
| Is this pure calculation? | YES | READ MODEL | Inventory level total |
| Is it immutable once created? | YES | EVENT | PaymentAuthorized |
| Does it recalculate multiple times? | YES | READ MODEL | Total sales (updates as orders change) |
| Is it independent (causes no other events)? | YES | EVENT | OrderFlagged (flagged for manual review) |
| Is it derived FROM other events? | YES | READ MODEL | OrderStatus (derived from multiple events) |

### Common Anti-Patterns 

**DON'T model these as EVENTS**:
- Inventory level totals (calculation from stock events)
- Inventory totals (sum of transactions)
- Account balances (calculation from transactions)
- Search indexes (derived from documents)
- Aggregated metrics (sums, counts, averages)
- Scheduled calculations (processor outputs that are pure calculation)

**DO model them as READ MODELS**:

 WRONG: Modeling as Event
```
InventoryLevelRecalculated
  productId: product-456
  currentStock: 84          (This recalculates!)
  reservedStock: 12         (Derived, not a fact)
```

 CORRECT: Model as Read Model
```
InventoryLevelView
  productId: product-456
  totalReceived: 200
  totalSold: 116
  currentStock: 84
  lastUpdated: 2025-01-24T10:30:00Z
  history:
    - 2024-12-01: stock 150 (200 received)
    - 2024-12-15: stock 110 (40 sold)
    - 2025-01-24: stock 84 (26 sold)
```

**WHY**:
- Events should capture facts (what happened)
- Calculations should be projections (how we view the facts)
- Otherwise you end up with circular dependencies and replay issues

---

## Workflow

Given commands and events, identify all outputs:

### 1. Map Event Data to UI Screens
For each screen, identify source events:

```
Screen: Order Status View
Displays data from events:
  orderId ← OrderCreated event
  customerId ← OrderCreated event
  items ← OrderCreated event
  total ← OrderCreated event
  status ← OrderConfirmed event (or OrderCancelled)
  confirmedAt ← OrderConfirmed event
  paymentId ← PaymentAuthorized event
  shipmentId ← OrderShipped event
  shippedAt ← OrderShipped event

This screen is a projection of these events:
  - OrderCreated
  - OrderConfirmed
  - PaymentAuthorized
  - OrderShipped
```

### 2. Define Read Models
Create optimized views from event data:

```
ReadModel: OrderStatusView
Purpose: UI displays current order status
Events subscribed: OrderCreated, OrderConfirmed, PaymentAuthorized, OrderShipped, OrderCancelled
Data:
{
  orderId: string (from OrderCreated)
  customerId: string (from OrderCreated)
  status: enum (from events: Draft → Confirmed → Authorized → Shipped → Delivered)
  createdAt: Date (from OrderCreated)
  confirmedAt: Date (from OrderConfirmed)
  paymentId: string (from PaymentAuthorized)
  shipmentId: string (from OrderShipped)
  shippedAt: Date (from OrderShipped)
}
```

### 3. Document Event → Data Mapping
Show exactly what data each event provides:

```
Event: OrderCreated
Provides to UI/Processors:
  orderId
  customerId
  items[]
  total
  shippingAddress
  createdAt

Event: OrderConfirmed
Provides to UI/Processors:
  orderId (link to stream)
  paymentMethod (user selected method)
  confirmedAt (timestamp)
  paymentId (payment system reference)

Event: PaymentAuthorized
Provides to UI/Processors:
  orderId (link to stream)
  paymentId
  authCode
  authorizedAt (timestamp)
  amount (verified amount)

Event: OrderShipped
Provides to UI/Processors:
  orderId (link to stream)
  shipmentId
  shippedAt (timestamp)
  carrier (shipping company)
  trackingNumber (for delivery tracking)
```

### 4. Create Output Catalog
List all read models:

```
ReadModel Catalog: Order System

1. OrderStatusReadModel
   Purpose: UI shows current order status
   Events: OrderCreated, OrderConfirmed, PaymentAuthorized, OrderShipped, OrderCancelled
   Data: orderId, status, createdAt, confirmedAt, paymentId, shipmentId
   Consumed by:
     - Order Status screen (UI)
     - Customer Dashboard (UI)
     - Order Processing Processor (decides if can ship)

2. OrderListReadModel
   Purpose: UI lists all orders for a customer
   Events: OrderCreated, OrderConfirmed, OrderCancelled
   Data: orderId, customerId, total, status, createdAt
   Consumed by:
     - Customer Order History (UI)
     - Order Search/Filter (UI)

3. PaymentStatusReadModel
   Purpose: UI shows payment status
   Events: OrderConfirmed, PaymentAuthorized, PaymentFailed
   Data: orderId, paymentId, status, authCode, failureReason, timestamp
   Consumed by:
     - Payment Status screen (UI)
     - Accounting Processor (reconciliation)

4. ShipmentTrackingReadModel
   Purpose: UI shows tracking information
   Events: OrderShipped, DeliveryConfirmed
   Data: orderId, shipmentId, trackingNumber, carrier, shippedAt, estimatedDelivery
   Consumed by:
     - Order Tracking screen (UI)
     - Customer notifications (Processor)
```

### 5. Identify Missing Data
Check if all UI needs are covered:

```
Question: What if UI needs "estimated delivery date"?
Event: OrderShipped has carrier + trackingNumber
Action needed: Add estimatedDelivery to OrderShipped event
  (or compute from carrier info)

Question: What if UI needs to show "payment method" on status?
Event: OrderConfirmed has paymentMethod
Action needed: Include paymentMethod in relevant read models

Question: What if UI needs "item descriptions"?
Event: OrderCreated has items[]
But: items[] only has productId
Action needed: Enrich with product descriptions from catalog
  (via join with product service)
```

### 6. Processor Outputs
Identify what processors consume:

```
Processor: Inventory System
Consumes from read models:
  - Orders in "PaymentAuthorized" status
  - Items and quantities needed
Produces commands:
  - ReserveInventory

Processor: Fulfillment System
Consumes from read models:
  - Orders in "InventoryReserved" status
  - Items and quantities
  - Shipping address
Produces commands:
  - CreateShipment

Processor: Notification System
Consumes from read models:
  - OrderCreated (sends confirmation)
  - OrderConfirmed (sends receipt)
  - OrderShipped (sends tracking)
  - DeliveryConfirmed (sends thank you)
Does not produce commands (info-only)
```

## Output Format

Present as:

```markdown
# Outputs: [Domain Name]

## Read Models Summary

| ReadModel | Purpose | Events | Consumed By |
|-----------|---------|--------|-------------|
| OrderStatus | Show order state | OrderCreated, OrderConfirmed | UI, Processor |
| OrderList | List orders | OrderCreated, OrderCancelled | UI |
| PaymentStatus | Payment info | OrderConfirmed, PaymentAuthorized | UI, Accounting |
| Shipment Tracking | Track delivery | OrderShipped, DeliveryConfirmed | UI, Notifications |

---

## Detailed Read Models

### ReadModel: OrderStatusView

**Purpose**: Order Status screen displays current order state

**Events subscribed**:
- OrderCreated
- OrderConfirmed
- PaymentAuthorized
- OrderShipped
- OrderCancelled
- DeliveryConfirmed

**Data**:
```
{
  orderId: string
  customerId: string
  status: 'Draft' | 'Confirmed' | 'Authorized' | 'Shipped' | 'Delivered' | 'Cancelled'
  items: Array<{productId, quantity, unitPrice}>
  total: number
  shippingAddress: Address

  createdAt: Date
  confirmedAt: Date
  paymentId: string
  paymentMethod: 'card' | 'transfer'
  authorizedAt: Date

  shipmentId: string
  carrier: string
  trackingNumber: string
  shippedAt: Date
  estimatedDelivery: Date
}
```

**Update Logic**:
- OrderCreated: Insert with status='Draft'
- OrderConfirmed: Update status='Confirmed'
- PaymentAuthorized: Update status='Authorized', set paymentId
- OrderShipped: Update status='Shipped', set shipmentId, carrier, trackingNumber
- DeliveryConfirmed: Update status='Delivered'
- OrderCancelled: Update status='Cancelled'

**Consumed By**:
- Order Status Screen (displays)
- Order Processing Processor (checks status)
- Notification System (sends updates)

--- [Repeat for each read model]

---

## Data Completeness Check

### Events → UI Needs

Verify all UI needs have event sources:

| UI Need | Event Source | Status |
|---------|-------------|--------|
| Order status | OrderConfirmed, OrderShipped |  |
| Tracking number | OrderShipped |  |
| Order items | OrderCreated |  |
| Estimated delivery | OrderShipped |  |
| Cancellation reason | OrderCancelled |  |

### Missing Data

Identify UI needs without event sources:
- None identified 

---

## Processor Consumption

### Processors and their reads:

| Processor | Reads From | Writes Commands |
|-----------|-----------|-----------------|
| Inventory | OrderStatusView (Authorized) | ReserveInventory |
| Fulfillment | OrderStatusView (InventoryReserved) | CreateShipment |
| Notification | OrderStatusView (all) | None (info-only) |
| Accounting | PaymentStatusView | None (reporting) |
```

## Quality Checklist

### Read Model Design
- [ ] Every UI screen maps to read model(s)
- [ ] Every read model has clear purpose
- [ ] Every data field has event source
- [ ] Update logic for each event is explicit
- [ ] All UI needs are covered
- [ ] Processor reads are identified
- [ ] Read model access patterns clear
- [ ] No undocumented data sources
- [ ] Compensation/cancellation handled
- [ ] Error states shown

### CRITICAL: Event vs Read Model Validation
- [ ] **Reviewed each read model**: "Is this pure calculation or an actual domain fact?"
- [ ] **No aggregations modeled as events**: (totals, averages, counts are read models)
- [ ] **No recalculated state modeled as events**: (if value changes multiple times, it's a read model)
- [ ] **Processor outputs are categorized**:
  - [ ] Produces NEW EVENT = actual domain fact (e.g., PaymentAuthorized)
  - [ ] Updates READ MODEL = calculation (e.g., SellerRatingCalculated)
  - [ ] Sends NOTIFICATION = info-only (no event or model)
- [ ] **History tracking is clear**: Derived state keeps history in read model `history[]`, not as separate events

## Key Principles

1. **Event-Driven**: All data comes from events
2. **Projection-Based**: Read models are projections, not persistent
3. **UI-Focused**: Optimized for UI display needs
4. **Processor-Friendly**: Enough data for processor decisions
5. **Completeness**: All needed data available

## Common Patterns

### Status View Pattern
```
Events: Create, Confirm, Process, Ship
ReadModel: Accumulates data from all events
Displayed: Current state reflecting all events
```

### List View Pattern
```
Events: Create, Update, Delete (Cancel)
ReadModel: Summary of each item
Used for: Filtering, sorting, searching
```

### Timeline View Pattern
```
Events: Any event with timestamp
ReadModel: Chronological list
Used for: History, audit trail
```

### Processor Decision Pattern
```
Events: State-changing events
ReadModel: Current state only
Processor reads to decide next action
```
