# Claim Checks for Content Stored Out of Line

Use this reference when defining a pointer to content stored out of line.

## A Locator and a Digest, Together

Content stored out of line (blob storage, an artifact store, a large payload moved out of the message body) is the [claim check pattern](https://www.enterpriseintegrationpatterns.com/ClaimCheck.html): the message carries a claim, not the content. The claim is only useful if it says both where the content is and what it should hash to. Keep both fields in one value object; a locator in one message and a digest in a sibling field invites the two being paired wrong after an edit or a partial copy.

```protobuf
// Avoid: locator and digest live in different messages, so nothing stops
// a locator from one artifact pairing with a digest from another.
message StartRestore {
  string storage_locator = 1;
}

message RestoreManifest {
  string expected_digest = 1;
}

// Prefer: the claim check is one value object with both fields.
message Digest {
  string algorithm = 1;  // e.g. "sha256"
  bytes value = 2;
}

message ClaimCheck {
  string storage_locator = 1;
  Digest digest = 2;
}

message StartRestore {
  ClaimCheck claim_check = 1;
}
```

## Review Questions

- Does any out-of-line content pointer carry a locator without the digest it is verified against, or vice versa, in separate messages?
