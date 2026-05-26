# Event Naming Rules

Use this reference when the default event-definition skill needs examples or edge-case guidance for event names.

## Past Tense

Events record something that already happened. Always use past tense.

| Good | Bad | Why bad |
|------|-----|---------|
| `OrderPlaced` | `PlaceOrder` | Imperative; that is a command |
| `PaymentFailed` | `PaymentFailing` | Progressive; not a fact yet |
| `ItemAddedToCart` | `AddItemToCart` | Imperative |
| `SubscriptionRenewed` | `RenewSubscription` | Imperative |
| `OrderPlaced` | `OrderWasPlaced` | Redundant; events are already facts |

## Domain Language

Use the language of the business, not the implementation.

| Good | Bad | Why bad |
|------|-----|---------|
| `OrderPlaced` | `OrderCreated` | "Created" is CRUD, not domain language, unless creation is the domain concept |
| `ShipmentDispatched` | `ShipmentUpdated` | "Updated" says nothing about what happened |
| `ClaimApproved` | `ClaimStatusChanged` | Hides the actual business event |
| `EmployeePromoted` | `EmployeeRecordModified` | Technical, not business language |

## Specific Facts

An event name should tell you what happened without requiring the payload.

| Good | Bad | Why bad |
|------|-----|---------|
| `OrderItemAdded` | `OrderChanged` | What changed? |
| `InvoiceSentToCustomer` | `InvoiceProcessed` | Processed how? |
| `PasswordResetRequested` | `UserActionOccurred` | Meaningless |
| `InventoryReplenished` | `InventoryEvent` | Category, not a fact |

## CRUD Names

Reserve `Created`, `Updated`, and `Deleted` for domains where those operations are the business concept.

| Domain | CRUD OK? | Better name |
|--------|----------|-------------|
| Order management | No | `OrderPlaced`, not `OrderCreated` |
| CMS page editing | Yes | `PageCreated` is the actual domain concept |
| User signup | No | `AccountRegistered`, not `UserCreated` |
| Config management | Yes | `SettingUpdated` is the actual domain concept |

## One Event, One Fact

Do not combine multiple facts into one event name.

| Good | Bad |
|------|-----|
| `OrderPlaced` + `PaymentAuthorized` | `OrderPlacedAndPaymentAuthorized` |
| `ItemShipped` + `TrackingNumberAssigned` | `ItemShippedWithTracking` |

If two things always happen together, they are still two events that happen to share the same cause.

## Naming Format

Choose one format and apply it consistently across the system:

- **PascalCase**: `OrderPlaced`, `PaymentFailed`
- **dot.delimited**: `order.placed`, `payment.failed`
- **kebab-case**: `order-placed`, `payment-failed`

Do not mix formats within a system.

## Redundant Suffixes

The event name describes what happened. It is already an event by context.

| Good | Bad | Why bad |
|------|-----|---------|
| `OrderPlaced` | `OrderPlacedEvent` | Redundant |
| `PaymentFailed` | `PaymentFailedMessage` | "Message" is delivery, not the domain fact |
| `ShipmentDispatched` | `ShipmentDispatchedNotification` | "Notification" is a side effect |

## Infrastructure Terms

Event names must survive technology migrations. Do not embed broker names, protocols, or infrastructure details.

| Good | Bad | Why bad |
|------|-----|---------|
| `OrderPlaced` | `KafkaOrderPlaced` | Coupled to Kafka |
| `PaymentCompleted` | `SQSPaymentCompleted` | Coupled to SQS |
| `UserRegistered` | `RabbitMQUserRegisteredMessage` | Infrastructure plus redundant suffix |

## Negative Names

Negative event names usually hide a positive event with a reason. Prefer the positive form with a field explaining the outcome.

| Good | Bad | Why bad |
|------|-----|---------|
| `ShipmentFailed { reason: "address_invalid" }` | `OrderNotShipped` | Negative; what did happen? |
| `PaymentDeclined { reason: "insufficient_funds" }` | `PaymentNotProcessed` | Negative and vague |
| `ApplicationRejected { reason: "..." }` | `ApplicationNotApproved` | Double negative around approval |

If a negative sounds natural in the domain, such as `ClaimDenied`, it is acceptable.

## Integration Events

Integration events cross service boundaries, so names need enough scope to avoid collisions across domains.

| Good | Bad | Why bad |
|------|-----|---------|
| `billing.InvoiceIssued` | `InvoiceIssued` | Which service issued it? |
| `warehouse.ShipmentDispatched` | `ShipmentDispatched` | Could be logistics or warehouse |
| `identity.AccountLocked` | `AccountLocked` | Could be identity or fraud |

Use vocabulary consumers understand:

| Good | Bad |
|------|-----|
| `order.PaymentCompleted` | `order.PGTxnSettled` |
| `shipping.DeliveryAttempted` | `shipping.LMDAttemptV2` |
