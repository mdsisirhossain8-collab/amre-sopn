# Security Specification for Sisir Fashion Hub

## Data Invariants
1. **Products & Categories**: Publicly readable. Only admins can create, update, or delete.
2. **Orders**: Users can only create orders for themselves. Only the order owner or an admin can read or update an order. Users cannot change the `userId` or `total` of an existing order.
3. **Messages**: Users can only create messages where they are the `senderId`. Users can only read messages where they are either the `senderId` or `receiverId`.
4. **SiteContent**: Publicly readable. Only admins can update.
5. **SimulatedUsers**: Users can only read and update their own profile. Sensitive fields like `isAdmin` cannot be changed by the user.

## The Dirty Dozen (Malicious Payloads)
1. **Identity Spoofing (Order)**: User A tries to create an order with `userId: "UserB"`.
2. **Price Manipulation**: User tries to update a Product's `price` to $0.01.
3. **Ghost Field Injection**: User tries to add `isVerified: true` to their `simulatedUsers` profile.
4. **Admin Escalation**: User tries to update their own profile to set `isAdmin: true`.
5. **Status Hijacking**: User tries to update an Order `status` to 'delivered' before it's paid.
6. **Orphaned Message**: User tries to create a message with a random, non-existent `orderId`.
7. **Large Payload Attack**: User tries to send a 1MB string in the `text` field of a Message.
8. **Resource Poisoning**: User tries to create a Product with a 2KB junk string as the document ID.
9. **Cross-User Message Read**: User A tries to list all messages (including User B's private chats).
10. **Immutable Field Breach**: User tries to change the `createdAt` timestamp of an old Order.
11. **System Field Overwrite**: User tries to modify the `dbId` in the `_health` collection.
12. **Unverified Admin Attempt**: User with unverified email tries to update `siteContent`.

## Test Runner Logic (Draft)
The `firestore.rules.test.ts` will verify these scenarios return `PERMISSION_DENIED`.
