import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyASa73WgPnx6ftr81uPPUCthPXhhJ6wIrg",
  authDomain: "dumek-powerman.firebaseapp.com",
  projectId: "dumek-powerman",
  appId: "1:728084163243:web:ab7e0a25c93277c8c4e5ee"
};

export function hasFirebaseConfig() {
  return Object.values(firebaseConfig).every(value => value && !String(value).includes("PASTE_") && !String(value).includes("YOUR_PROJECT_ID"));
}

export function getFirebaseSetupError() {
  if (!hasFirebaseConfig()) {
    return new Error("Add your Firebase web app config to js/firebase.js.");
  }
  return null;
}

const app = hasFirebaseConfig() ? initializeApp(firebaseConfig) : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
