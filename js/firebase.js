import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyASa73WgPnx6ftr81uPPUCthPXhhJ6wIrg",
  authDomain: "dumek-powerman.firebaseapp.com",
  projectId: "dumek-powerman",
  appId: "1:728084163243:web:ab7e0a25c93277c8c4e5ee"
};

if (Object.values(firebaseConfig).some(value => !value || value.includes("PASTE_") || value.includes("YOUR_PROJECT_ID"))) {
  throw new Error("Add your Firebase web app config to js/firebase.js.");
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
