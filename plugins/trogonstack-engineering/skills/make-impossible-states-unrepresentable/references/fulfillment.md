# Choosing a fulfillment method

At this checkout, pickup requires a store and a collection window. Delivery requires an address and a delivery service. Either order can include a gift message.

A record with a method tag and optional payload fields accepts a pickup with no store. Giving each field its own enum still lets a caller pair a store with a delivery service.

```rust
enum Destination {
    Store(StoreId),
    Home(Address),
}

enum Arrangement {
    Collection(PickupWindow),
    Delivery(DeliveryService),
}

struct LooseFulfillment {
    destination: Destination,
    arrangement: Arrangement,
}

fn mismatched(store: StoreId, service: DeliveryService) -> LooseFulfillment {
    LooseFulfillment {
        destination: Destination::Store(store),
        arrangement: Arrangement::Delivery(service),
    }
}
```

The customer makes one choice that determines both fields. Give each fulfillment method an enum variant that owns its details.

```rust
enum Fulfillment {
    Pickup { store: StoreId, window: PickupWindow },
    Delivery { address: Address, service: DeliveryService },
}

struct Order {
    id: OrderId,
    fulfillment: Fulfillment,
    gift_message: Option<GiftMessage>,
}

fn schedule(fulfillment: Fulfillment) {
    match fulfillment {
        Fulfillment::Pickup { store, window } => reserve_window(store, window),
        Fulfillment::Delivery { address, service } => book_delivery(address, service),
    }
}
```

Matching `Fulfillment::Pickup` supplies both arguments to `reserve_window`. Rust rejects a `DeliveryService` in the `window` field. The gift message stays optional on the order because the customer can omit it with either fulfillment method.

If customers can save an order before choosing a method, that is a real additional state. A draft can carry `Option<Fulfillment>` when a selection can be absent or complete. If customers can also save a store before choosing a window, the draft needs to represent that partial choice. The confirmed order still requires a complete fulfillment.
