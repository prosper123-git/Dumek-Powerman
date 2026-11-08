# Firebase Firestore setup

## Create the database and publish rules

1. In Firebase Console, open **Build → Firestore Database** and create the database.
2. Open **Rules**, replace the contents with [`firestore.rules`](./firestore.rules), and publish.
3. Keep the Firebase project’s **Email/Password** sign-in provider enabled.

The rules let visitors read product availability, but prevent browser clients from changing inventory. Signed-in users can read and write only their own profile document. Manage product availability from Firebase Console; do not make product writes public.

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

Each product document needs `name` and `category` as strings, `description` as a string, `price` as a number or `null` while the price is unknown, and `available` as a Firestore **number**. Set `available` to the real current sellable unit count, including `0` when out of stock. The site reads the product names, categories, descriptions, prices, and availability from these documents and updates counts live. If a product document or valid count is missing, its count is shown as not set rather than inventing stock.

New accounts are stored in `users/{Firebase Authentication UID}` with `firstName`, `surname`, `email`, and server timestamps. The account name is also saved to Firebase Authentication as the display name.
