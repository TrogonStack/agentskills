---
name: eventmodeling-plotting-events
description: >-
  Step 2 of Event Modeling - Arrange events chronologically in logical narrative
  sequence. Create timeline showing event flow and dependencies. Use after
  brainstorming events. Do not use for: brainstorming new events (use
  eventmodeling-brainstorming-events) or designing command/read model
  architecture (use eventmodeling-designing-event-models).
allowed-tools: Write
---

# Plotting Events

Arrange all brainstormed events chronologically to create a logical sequence that makes sense as a narrative timeline. Show how events flow and depend on each other.

## Workflow

Given a list of brainstormed events, create the chronological plot:

### 1. Sequence Events Chronologically
Order events in time-based narrative:
- What happens first?
- What depends on what?
- What's the causal chain?

Format:
```
Timeline: Order Processing

1. Customer initiates → OrderCreated
   (Event: OrderCreated)

2. Order confirmed → OrderConfirmed
   Depends on: OrderCreated happened
   (Event: OrderConfirmed)

3. Payment processed → PaymentAuthorized
   Depends on: OrderConfirmed happened
   (Event: PaymentAuthorized)

4. Inventory reserved → InventoryReserved
   Depends on: PaymentAuthorized happened
   (Event: InventoryReserved)

5. Order shipped → OrderShipped
   Depends on: InventoryReserved happened
   (Event: OrderShipped)

6. Delivery confirmed → DeliveryConfirmed
   Depends on: OrderShipped happened
   (Event: DeliveryConfirmed)
```

### 2. Show Dependencies and Causality
Document what triggers each event:
```
Event: OrderConfirmed
Can only happen after: OrderCreated
Triggered by: Customer confirms order
Precondition: Order in Draft state

Event: PaymentAuthorized
Can only happen after: OrderConfirmed
Triggered by: Payment gateway authorizes
Precondition: Order confirmed and payment submitted
```

### 3. Identify Alternative Paths
Show events that can diverge:
```
After OrderCreated:
Path A: Customer confirms → OrderConfirmed
Path B: Customer cancels → OrderCancelled

After PaymentAuthorized:
Path A: Payment succeeds → PaymentProcessed
Path B: Payment fails → PaymentFailed → OrderCancelled
```

### 4. Create Timeline Diagram
Visual representation of event flow:

```

 Time →                                           

 OrderCreated                                     
    ↓                                             
 OrderConfirmed                                   
    → PaymentAuthorized                          
        → InventoryReserved                     
            → OrderShipped                     
                 → DeliveryConfirmed           
        → PaymentFailed → OrderCancelled        
    → OrderCancelled (rejected before payment)   

```

## Output Format

Present as:

```markdown
# The Plot: [Domain Name]

## Chronological Event Sequence

### Phase 1: Order Initiation
1. **OrderCreated** - When: Customer submits order
   - Previous state: None (initial event)
   - Next possible: OrderConfirmed or OrderCancelled

### Phase 2: Order Confirmation
2. **OrderConfirmed** - When: Customer confirms and payment ready
   - Depends on: OrderCreated
   - Next possible: PaymentAuthorized or OrderCancelled

### Phase 3: Payment Processing
3. **PaymentAuthorized** - When: Payment gateway approves
   - Depends on: OrderConfirmed
   - Next possible: InventoryReserved or PaymentFailed

4. **PaymentFailed** - When: Payment declined
   - Depends on: OrderConfirmed (payment attempted)
   - Next possible: OrderCancelled (or retry)

### Phase 4: Fulfillment
5. **InventoryReserved** - When: Inventory allocated
   - Depends on: PaymentAuthorized
   - Next possible: OrderShipped

6. **OrderShipped** - When: Order leaves warehouse
   - Depends on: InventoryReserved
   - Next possible: DeliveryConfirmed

### Phase 5: Delivery
7. **DeliveryConfirmed** - When: Customer receives order
   - Depends on: OrderShipped
   - Next possible: None (terminal)

### Phase 6: Cancellations (Alternative Path)
8. **OrderCancelled** - When: Customer cancels or payment fails
   - Can happen after: OrderCreated, OrderConfirmed, PaymentFailed
   - Next possible: RefundInitiated

9. **RefundInitiated** - When: Refund processed
   - Depends on: OrderCancelled
   - Next possible: None (terminal)

## Event Flow Diagram

[ASCII or text representation of timeline]

## Key Insights

- **Critical Path**: Events that must happen in order
- **Decision Points**: Where flow branches
- **Terminal Events**: Where flow ends
- **Compensation Events**: How to handle cancellations
- **Wait States**: Where system pauses for external action
```

## Quality Checklist

- [ ] Every event has clear predecessor
- [ ] Dependencies are explicitly documented
- [ ] Alternative paths are shown
- [ ] Flow forms a coherent narrative
- [ ] No events without trigger
- [ ] Terminal states are clear
- [ ] Compensation/cancellation flows are complete
- [ ] Timeline makes business sense

## Principles

1. **Narrative Coherence**: Events tell a story
2. **Dependency Clarity**: What must come before what
3. **Alternative Paths**: Show all possible flows (happy path + errors)
4. **Natural Sequence**: Order matches business domain logic
5. **Completeness**: Every brainstormed event appears
