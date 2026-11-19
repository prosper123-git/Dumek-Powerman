import { db, getFirebaseSetupError } from "./firebase.js";
import {
  addDoc, collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

function ensureFirestoreReady() {
  const setupError = getFirebaseSetupError();
  if (setupError) throw setupError;
  if (!db) throw new Error("Firebase is not configured. Add your Firebase web app config to js/firebase.js.");
}

export async function recordSale(sale) {
  ensureFirestoreReady();
  const saleNumber = `DP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const saleRef = doc(collection(db, "sales"));
  const quantitiesByProduct = new Map();
  for (const line of sale.lines) {
    if (!line.productId) continue;
    quantitiesByProduct.set(line.productId, (quantitiesByProduct.get(line.productId) || 0) + line.quantity);
  }

  await runTransaction(db, async transaction => {
    const inventory = [];
    for (const [productId, quantity] of quantitiesByProduct) {
      const productRef = doc(db, "products", productId);
      const productSnapshot = await transaction.get(productRef);
      const product = productSnapshot.data();
      if (!productSnapshot.exists() || !Number.isSafeInteger(product?.available) || product.available < 0) {
        const error = new Error(`Stock count is missing for ${sale.lines.find(line => line.productId === productId)?.name || "this product"}. Ask the manager to update the inventory.`);
        error.code = "inventory/count-unavailable";
        throw error;
      }
      if (product.available < quantity) {
        const error = new Error(`Not enough stock for ${sale.lines.find(line => line.productId === productId)?.name || "this product"}. ${product.available} available; ${quantity} requested.`);
        error.code = "inventory/insufficient-stock";
        throw error;
      }
      inventory.push({ productRef, remaining: product.available - quantity });
    }

    for (const item of inventory) {
      transaction.update(item.productRef, { available: item.remaining });
    }
    transaction.set(saleRef, {
      ...sale,
      saleNumber,
      createdAt: serverTimestamp()
    });
  });
  return { id: saleRef.id, saleNumber };
}

export async function recordLogin(user, profile) {
  ensureFirestoreReady();
  await addDoc(collection(db, "loginEvents"), {
    userId: user.uid,
    email: user.email,
    name: [profile.firstName, profile.surname].filter(Boolean).join(" ") || user.displayName || user.email,
    createdAt: serverTimestamp()
  });
}

export function watchManagerActivity(onActivity, onError) {
  ensureFirestoreReady();
  let sales = [];
  let logins = [];
  let salesLoaded = false;
  let loginsLoaded = false;
  let salesError = null;
  let loginsError = null;

  const publish = () => {
    onActivity({
      sales,
      logins,
      loading: !salesLoaded || !loginsLoaded,
      error: salesError || loginsError
    });
  };

  const stopSales = onSnapshot(
    query(collection(db, "sales"), orderBy("createdAt", "desc")),
    snapshot => {
      sales = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      salesLoaded = true;
      salesError = null;
      publish();
    },
    error => {
      salesLoaded = true;
      salesError = error;
      publish();
      onError(error);
    }
  );
  const stopLogins = onSnapshot(
    query(collection(db, "loginEvents"), orderBy("createdAt", "desc")),
    snapshot => {
      logins = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      loginsLoaded = true;
      loginsError = null;
      publish();
    },
    error => {
      loginsLoaded = true;
      loginsError = error;
      publish();
      onError(error);
    }
  );

  return () => {
    stopSales();
    stopLogins();
  };
}
