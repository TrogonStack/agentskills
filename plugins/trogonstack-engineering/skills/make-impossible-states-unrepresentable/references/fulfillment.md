# Choosing a fulfillment method

At this checkout, pickup requires a store and a collection window. Delivery requires an address and a delivery service. Either order can include a gift message.

A record with a method tag and optional payload fields accepts a pickup with no store. Giving each field its own union fixes the missing values but still lets the caller pair a store with a delivery service.

```text
Fulfillment = {
    destination: StoreId | Address,
    arrangement: PickupWindow | DeliveryService
}
```

The customer makes one choice that determines both fields. Put the union around the fulfillment details.

```text
Order = {
    id: OrderId,
    fulfillment: Fulfillment,
    giftMessage: Option<GiftMessage>
}

Fulfillment =
    | Pickup   { store: StoreId, window: PickupWindow }
    | Delivery { address: Address, service: DeliveryService }
```

Matching `Pickup` supplies both arguments to `reserveWindow(store, window)`. A delivery service cannot occupy the window field. The gift message stays optional on the order because the customer can omit it with either fulfillment method.

If customers can save an order before choosing a method, that is a real additional state. A draft can carry `Option<Fulfillment>` when a selection can be absent or complete. If customers can also save a store before choosing a window, the draft needs to represent that partial choice. The confirmed order still requires a complete fulfillment.
