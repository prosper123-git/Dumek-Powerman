import { db, getFirebaseSetupError } from "./firebase.js";
import {
  collection, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export const watchProductInventory = (onInventory, onError) => {
  if (!db) {
    const error = getFirebaseSetupError() || new Error("Firebase is not configured. Add your Firebase web app config to js/firebase.js.");
    if (onError) onError(error);
    return () => {};
  }

  return onSnapshot(
    collection(db, "products"),
    snapshot => {
      const inventory = {};
      snapshot.forEach(product => {
        inventory[product.id] = product.data();
      });
      onInventory(inventory);
    },
    onError
  );
};
