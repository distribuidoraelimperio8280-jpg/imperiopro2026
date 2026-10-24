# Security Specification: Imperio Pro Contabilidad

## 1. Data Invariants
- Each document in `invoices`, `contacts`, `products`, `expenses`, `quotes`, `creditNotes`, and `companyProfiles` must be owned by an authenticated user.
- Read and Write operations are strictly scoped to the owner (`request.auth.uid == resource.data.userId` or matching `userEmail`).
- Incoming documents must contain valid string IDs matching safe regex `^[a-zA-Z0-9_\-]+$`.
- Text fields are bounded with `.size() <= MAX` to prevent denial-of-wallet exhaustion attacks.
- Timestamps and required properties are strictly validated on create and update.

## 2. The Dirty Dozen Payloads
1. **Unauthenticated Read on Invoices**: Anonymous user attempts to read `/invoices/{invoiceId}`.
2. **Cross-Tenant Read**: Authenticated user B attempts to list or get user A's invoices.
3. **Id Poisoning**: Attacker sends a 100KB junk ID containing special characters.
4. **Shadow Field Injection**: Attacker injects `isAdmin: true` or `role: 'superadmin'` during user profile write.
5. **Ghost Invoice Creation**: Attacker creates an invoice with a mismatched `userId` (`request.auth.uid != incoming().userId`).
6. **Immortal Field Tampering**: User attempts to mutate `userId` or `createdAt` on an existing product or invoice.
7. **Negative Price / Stock Exploit**: Attacker sends `price: -500` or non-number total.
8. **PII Scraping via Blanket List**: Attacker attempts `list` on `/contacts` without restricting by `userId`.
9. **Unbounded Payload Flood**: Attacker creates a contact with a 50KB name string.
10. **Terminal State Bypass**: User attempts to modify an already `cancelled` or finalized transaction without proper privileges.
11. **Spoofed Email Invariant**: User with unverified or mismatched email attempts to write company profile.
12. **Null Request Resource on Delete NPE**: Invoking incoming validation helpers inside delete rules.

## 3. Test Runner
All payloads tested against standard Firestore ABAC assertions.
