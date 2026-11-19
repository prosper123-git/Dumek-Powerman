# Firebase Firestore setup

## Create the database and publish rules

1. In Firebase Console, open **Build → Firestore Database** and create the database.
2. Open **Rules**, replace the contents with [`firestore.rules`](./firestore.rules), and publish.
3. Keep the Firebase project’s **Email/Password** sign-in provider enabled.
4. If the app is still showing a Firestore setup message, open [`js/firebase.js`](./js/firebase.js) and confirm the web app config matches the Firebase project you created.

Visitors can read product availability. Authorized cashiers and managers can only decrease the `available` field; cash and credit checkout both update inventory and create the sale record together in a Firestore transaction. A sale is rejected if its stock count is missing or insufficient. Restock products in Firebase Console, since browser clients cannot increase or otherwise edit inventory. Staff can read and update only their own profile document; only a manager can create a cashier profile.

## Authorize store users and managers

Only signed-in users with a `cashier` or `manager` profile role can use the POS, cart, checkout, inventory updates, and sign-in activity recording. Public account creation is disabled. First publish the latest rules, then sign in as the manager and open **Manager → Add a cashier**. Each cashier gets an individual Firebase Authentication account and `users/{uid}` profile; give the temporary password to that cashier privately. They can reset it from the sign-in page. Email/Password sign-in must be enabled in Firebase Console.

To authorize the first manager, create that account under Firebase Console **Authentication → Users**, then create `users/{uid}` (using its Firebase Auth UID as the document ID) with `firstName`, `surname`, `email`, and a string field `role` set to `manager`. Existing staff profiles created before role-based authorization must also be assigned `role: cashier` (or `manager`) in Firestore Console. For a pre-existing Auth account with no profile, create the same `users/{uid}` document manually and set its role; the manager form is for creating new Auth accounts and cannot reuse an existing email. Accounts without a staff profile and role are denied access; users cannot create their own profiles or assign themselves a role. The manager page lists saved sales and successful sign-in times. Public catalogue browsing remains available without signing in.

The app records a sign-in event after a successful email/password login. Restoring an existing Firebase session after a browser refresh is not recorded as a new sign-in. Every completed sale is saved in the `sales` collection before the on-screen receipt is shown. Sales are immutable to browser clients.

At checkout, cashiers can select **Credit** instead of cash. Credit sales require the customer's name and phone number, record the full sale total as outstanding, and print a receipt marked **CREDIT SALE**. Managers can review the outstanding credit and customer details on the manager dashboard. The compact receipt print layout targets an 80 mm receipt printer; select the matching paper size in the browser print dialog if needed.

## Add inventory documents

Create a `products` collection. Add one document for each product with the document ID and fields below. Set `available` to the real current sellable unit count; do not use placeholder counts.

| Document ID | `name` | `category` |
|---|---|---|
| `101` | `GX390 Petrol Engine` | `Engines` |
| `102` | `GX160 Petrol Engine` | `Engines` |
| `103` | `190F 15HP Petrol Engine` | `Engines` |
| `104` | `WP30X Water Pump` | `Water Pumps` |
| `105` | `WP20X Water Pump` | `Water Pumps` |
| `106` | `Water Pump Hose` | `Accessories` |
| `107` | `Super Dunek Super-Strong Engine Oil` | `Lubricants` |

Each product document needs `name` and `category` as strings, `description` as a string, `price` as a number or `null` while the price is unknown, and `available` as a whole-number Firestore integer. Set `available` to the real current sellable unit count, including `0` when out of stock. The site reads product details and counts from these documents and updates counts live. When a catalog product is sold, its available count is decremented by the quantity in the cart, and the updated Firestore count is displayed to users. If a product document or valid count is missing, checkout is blocked rather than inventing stock.

Manager-provisioned profiles are stored in `users/{Firebase Authentication UID}` with `firstName`, `surname`, `email`, `role`, and server timestamps. The manager account must be provisioned once in Firebase Console as described above.
