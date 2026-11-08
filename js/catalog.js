import { db } from "./firebase.js";
import {
  collection, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export const watchProductInventory = (onInventory, onError) => onSnapshot(
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
