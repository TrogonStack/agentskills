---
name: eventmodeling-storyboarding-events
description: >-
  Step 3 of Event Modeling - Create UI storyboards/mockups showing what users
  see at each step. Capture all data fields needed from user perspective. Use
  after sequencing events. Do not use for: identifying commands or processor
  actions (use eventmodeling-identifying-inputs) or designing read models
  (use eventmodeling-identifying-outputs).
allowed-tools: AskUserQuestion, Write
---

# Storyboarding Events

## Interview Phase (Optional)

**When to Interview**: Skip if the user has already specified: existing UI patterns or mockups to reference, critical data fields, and UI/UX preferences. Interview when these details haven't been discussed or when the user wants guidance on storyboarding depth.

**Interview Strategy**: Clarify UI needs, data priorities, and existing patterns to guide storyboard design. This ensures mockups capture all necessary fields without over-designing.

### Critical Questions

When UI design guidance is needed:

1. **Current UI State** (Impact: Determines if you're designing from scratch or enhancing existing)
   - Question: "Do you have: (A) Existing UI/wireframes to reference, (B) Rough sketches, (C) Starting from scratch?"
   - Why it matters: Existing UI provides constraints and patterns; starting fresh allows more design freedom
   - Follow-up triggers: If (A) → ask to share; if (C) → ask about platform/technology

2. **Most Critical Data Fields** (Impact: Determines storyboard focus and detail level)
   - Question: "Which data fields are most important for users to see? (e.g., order status, payment confirmation, tracking info)"
   - Why it matters: Knowing priorities helps avoid over-designing; users need to see what matters most first
   - Follow-up triggers: For each critical field → ask "What decisions do users make based on this data?"

3. **UI/UX Preferences & Constraints** (Impact: Shapes storyboard style and interaction patterns)
   - Question: "Any UI preferences? (A) Web, (B) Mobile, (C) Both. And design style: (A) Minimal wireframes, (B) Detailed mockups, (C) Interact prototypes?"
   - Why it matters: Platform and fidelity affect storyboard detail; mobile has different constraints than web
   - Follow-up triggers: If (C) → ask about prototype tool; if minimal → discuss what level of detail is enough

### Interview Flow

**Conditional Entry**:
```
If user has provided:
  - Existing UI patterns or references
  - AND identified critical data fields
  - AND specified storyboard detail level

Then: Skip interview, proceed directly to storyboarding

Else: Conduct interview
```

**Phase 1: Context Assessment** (Questions 1-2)
- Understand existing UI context
- Identify data priorities
- Establish storyboard scope

**Phase 2: Design Guidance** (Question 3)
- Determine platform and fidelity
- Adjust storyboard detail accordingly

### Capturing Interview Findings

Document findings to guide storyboard creation:

```markdown
## Interview Findings: [Domain Name] UI

**Existing UI Context**: [Starting from scratch / Enhancing / Matching pattern]
**Most Critical Data**: [List fields in priority order]
**Platform**: [Web / Mobile / Both]
**Storyboard Detail**: [Minimal wireframes / Detailed mockups]

**Key UI Interactions**:
- [Action 1]: [What data triggers it]
- [Action 2]: [What data triggers it]

**Storyboard Focus**:
- Prioritize showing [most critical fields]
- Ensure [specific interactions] are clear
- Reference [existing patterns] for consistency
```

Optional: Write to `.trogonai/interviews/[timestamp]-storyboarding-events.interview.internal.trogonai.md`.

---

## Workflow

Given the event timeline, create UI storyboards:

### 1. Identify UI Screens/Views
Create a mockup for each state of the system:

```
Screen 1: Order Creation Form

 Place Your Order                

                                 
 Customer ID: [____________]     
                                 
 Items:                          
Product 1  Qty: [_]  Price: $_
Product 2  Qty: [_]  Price: $_
Product 3  Qty: [_]  Price: $_
                                 
 Total: $___                     
                                 
 Shipping Address:               
 [_____________________]         
 [_____________________]         
                                 
 [ Create Order ]                


Trigger: CreateOrder command
Result Events: OrderCreated
Data captured from UI:
  - customerId
  - items (products + quantities)
  - total
  - shippingAddress
```

### 2. Show State Transitions Between Screens
Document what changes when events occur:

```
Screen 2: Order Confirmation
(After OrderCreated event)


 Order Confirmation              

                                 
 Order ID: #12345                
 Status: Draft                   
                                 
 Items: 3 products               
 Total: $150.00                  
                                 
 Shipping: 123 Main St           
                                 
 Payment Options:                
Credit Card                   
Bank Transfer                 
                                 
 [ Confirm Order ]               


Trigger: ConfirmOrder command
Result Events: OrderConfirmed
Data from UI:
  - orderId (from OrderCreated)
  - paymentMethod
```

### 3. Document All Data Fields
For each screen, list what data is displayed:

```
Screen: Order Status View

 Your Order Status               

 Order ID: #12345                 (from OrderCreated)
 Status: Confirmed               (from OrderConfirmed)
 Confirmed at: 2024-12-31 10:00   (from OrderConfirmed)
                                 
 Payment: Authorized             (from PaymentAuthorized)
 Auth Code: AUTH-789              (from PaymentAuthorized)
                                 
 Inventory: Reserved             (from InventoryReserved)
 Expected Ship: 2025-01-02        (from InventoryReserved)
                                 
 Shipped: Pending                 (awaiting OrderShipped)
 Tracking: -- (waiting for shipment)


Fields and their origins:
  orderId → OrderCreated event
  status → OrderConfirmed event
  confirmedAt → OrderConfirmed event
  paymentStatus → PaymentAuthorized event
  authCode → PaymentAuthorized event
  inventoryStatus → InventoryReserved event
  expectedShip → InventoryReserved event
  tracking → OrderShipped event (when available)
```

### 4. Show Data Flow Through Screens
Map how data enters/exits UI:

```
Order Entry UI
   (user inputs)
   customerId
   items[]
   total
   shippingAddress
      ↓
      Command: CreateOrder
      ↓
      Event: OrderCreated
      ↓
      Order Status UI (displays)
       orderId (from event)
       items (from event)
       total (from event)
       shippingAddress (from event)
```

### 5. Organize Screens by Swimlane (Actor/System)

**MANDATORY**: Use the **Role Catalog** from Step 1 (eventmodeling-brainstorming-events) as the source of swimlanes. Every human role in the catalog MUST have its own swimlane. Every system actor that has a UI or todo-list view gets a swimlane too.

Group screens by who interacts with them:

```
Swimlane: Customer (Human Role)
   Screen 1: Order Entry Form
   Screen 2: Order Confirmation
   Screen 3: Order Status View
   Screen 4: Tracking View

Swimlane: Seller (Human Role)
   Screen 1: Order Fulfillment Dashboard
   Screen 2: Review Response Form
   Screen 3: Product Management

Swimlane: Support Agent (Human Role)
   Screen 1: Escalation Queue
   Screen 2: Manual Override Panel

Swimlane: Payment Processor (System Actor)
   Screen 1: Payment Verification (automated)
   Screen 2: Authorization Confirmation

Swimlane: Inventory System (System Actor)
   Screen 1: Reservation Todo List (internal)
   Screen 2: Availability Check

Swimlane: Fulfillment System (System Actor)
   Screen 1: Shipment Creation Todo
   Screen 2: Shipping Confirmation
```

**Validation**: If a role from the catalog has zero screens, either:
- The role is missing screens (add them), or
- The role doesn't belong in the catalog (remove it in Step 1)

This shows which actors interact with which screens and helps visualize system boundaries.

### 6. Show Processor "Todo List" Pattern
For automated processors, show the todo list metaphor:

```
Processor: InventoryReserver

Internal "Todo List" (based on received events):

 Inventory Reservation Todos     

                                 
Order-123: Reserve 2x Prod-1  (triggered by PaymentAuthorized)
Order-124: Reserve 3x Prod-2  (triggered by PaymentAuthorized)
Order-125: Reserve 1x Prod-3  (triggered by PaymentAuthorized)
                                 
 Processor checks todo items:    
 For each: Check availability    
          If available:  Mark done
          Reserve inventory      
          Produce event          
                                 


This todo list is driven by:
Events received → Items added to todo
Processor logic → Items processed
Success → InventoryReserved event produced + todo marked done
Failure → InventoryFailed event produced + todo marked failed
```

### 7. Identify Missing Data
Highlight where data doesn't have a clear source:

```
Problem: Order Status screen needs "expectedShip" date
Current state: Not in any event
Solution: Add expectedShip to InventoryReserved event

Problem: Order status needs "last updated" timestamp
Current state: No tracking of when last change occurred
Solution: Every event includes timestamp
```

## Output Format

Present as:

```markdown
# Storyboard: [Domain Name]

## Swimlane Organization (from Role Catalog)

### Human Role Swimlanes

#### Customer Swimlane
- Screen 1: Order Entry Form
- Screen 2: Order Confirmation
- Screen 3: Order Status View

#### [Other Human Role Swimlanes — one per role in the catalog]

### System Actor Swimlanes

#### Payment Processor Swimlane
- Screen 1: Payment Verification (automated)
- [Shows what UI/views the processor interacts with]

#### [Other System Actor Swimlanes]

---

## Screen 1: [Screen Name]

### Mockup
```
[ASCII art mockup or description]
```

### Data Displayed
- Field 1: Description, source event
- Field 2: Description, source event

### User Actions (Commands)
- Action: [Action], produces: [Event]

### Business Rules
- Rule about what can/cannot be done on this screen

---

## Screen 2: [Screen Name]

[Repeat for each screen]

---

## Processor Todo Lists

### Processor: [Processor Name]

Internal "Todo List" pattern:
```
Triggered by: [Event type]
Todo action: [What needs to be done]
Success produces: [Event]
Failure produces: [Event]
```

[Repeat for each processor]

---

## Data Flow Diagram

[Show how data enters from UI and returns via events]

---

## Field Traceability Matrix

| Field | Screen | Source Event | Status |
|-------|--------|-------------|--------|
| orderId | Status View | OrderCreated |  |
| shipmentId | Status View | OrderShipped |  |
| customerId | All | OrderCreated |  |

---

## Missing Data Analysis

[Any fields without clear source or destination]
```

## Quality Checklist

- [ ] Every screen has a mockup or clear description
- [ ] Every displayed field has a source event
- [ ] Every user action maps to a command
- [ ] Commands map to events
- [ ] Data flows make sense
- [ ] No missing data sources
- [ ] State transitions are clear
- [ ] Alternative states are shown
- [ ] Error states are shown
- [ ] **Every human role from the Role Catalog has at least one swimlane**
- [ ] **Every swimlane is labeled with the role/actor name from the catalog**
- [ ] **Swimlanes organized by actor/system**
- [ ] **Human role screens clearly separated from processor screens**
- [ ] **Processor todo list pattern shown for automated systems**
- [ ] **System boundaries visible through swimlane organization**

## Key Principles

1. **User-Centric**: Design from what users see and do
2. **Data Traceability**: Every field has origin and destination
3. **Completeness**: All needed data is visible
4. **Clarity**: UI clearly shows system state
5. **Consistency**: Same data presented consistently across screens

## Common Patterns

### Input Screen Pattern
```
User fills form (captures command data)
  ↓
Submit button (issues command)
  ↓
Event created with form data
  ↓
Confirmation screen displayed
```

### Status Screen Pattern
```
System displays current state (from read model)
  ↓
Based on latest events
  ↓
Shows all relevant information
  ↓
Available actions based on state
```

### Error State Pattern
```
User action fails (command rejected)
  ↓
No event created
  ↓
Error message displayed
  ↓
UI allows retry or alternative action
```
