import { auth, db, firebaseConfig, getFirebaseSetupError } from "./firebase.js";
import {
  createUserWithEmailAndPassword, deleteUser, getAuth, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { deleteApp, initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  doc, getDoc, onSnapshot, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

function ensureFirebaseReady() {
  const setupError = getFirebaseSetupError();
  if (setupError) {
    throw setupError;
  }
  if (!auth || !db) {
    throw new Error("Firebase is not configured. Add your Firebase web app config to js/firebase.js.");
  }
}

export const login = async (email, pw) => {
  ensureFirebaseReady();
  const credential = await signInWithEmailAndPassword(auth, email, pw);
  const profileRef = doc(db, "users", credential.user.uid);
  const profile = await getDoc(profileRef);
  if (!profile.exists()) {
    const error = new Error("This account has not been added as store staff. Ask the manager to create your cashier account.");
    error.code = "staff/profile-not-found";
    await signOut(auth).catch(signOutError => console.error("Could not sign out an account without a staff profile.", signOutError));
    throw error;
  }
  const profileData = profile.data();
  if (!["cashier", "manager"].includes(profileData.role)) {
    const error = new Error("This account does not have a cashier or manager role. Ask the manager to authorize it.");
    error.code = "staff/role-not-authorized";
    await signOut(auth).catch(signOutError => console.error("Could not sign out an account without a staff role.", signOutError));
    throw error;
  }
  let activityError = null;
  try {
    const sales = await import("./sales.js");
    await sales.recordLogin(credential.user, profileData);
  } catch (error) {
    console.error("Could not record sign-in activity.", error);
    activityError = error;
  }
  return { credential, activityError };
};

export const createCashierAccount = async ({ firstName, surname, email, password }) => {
  ensureFirebaseReady();
  if ([firstName, surname, email, password].some(value => typeof value !== "string")) {
    throw new Error("Enter both names, an email address, and a temporary password.");
  }
  const cleanFirstName = firstName.trim();
  const cleanSurname = surname.trim();
  const cleanEmail = email.trim();
  if (!cleanFirstName || cleanFirstName.length > 80 || !cleanSurname || cleanSurname.length > 80
    || !cleanEmail || cleanEmail.length > 254 || password.length < 8) {
    throw new Error("Enter both names, a valid email address, and a temporary password with at least 8 characters.");
  }

  const appName = `cashier-provision-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const provisioningApp = initializeApp(firebaseConfig, appName);
  const provisioningAuth = getAuth(provisioningApp);
  let credential = null;
  let profileSaved = false;
  try {
    credential = await createUserWithEmailAndPassword(provisioningAuth, cleanEmail, password);
    await updateProfile(credential.user, { displayName: `${cleanFirstName} ${cleanSurname}` });
    await setDoc(doc(db, "users", credential.user.uid), {
      firstName: cleanFirstName,
      surname: cleanSurname,
      email: credential.user.email,
      role: "cashier",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    profileSaved = true;
    return { email: credential.user.email };
  } catch (error) {
    if (credential && !profileSaved) {
      try {
        await deleteUser(credential.user);
      } catch (cleanupError) {
        console.error("Could not remove the incomplete cashier account.", cleanupError);
        throw new Error("The cashier profile could not be saved and the new authentication account could not be removed. Ask the manager to check Firebase Console before retrying.");
      }
    }
    throw error;
  } finally {
    await signOut(provisioningAuth).catch(error => {
      console.error("Could not sign out the temporary account session.", error);
    });
    await deleteApp(provisioningApp).catch(error => {
      console.error("Could not dispose of the temporary authentication client.", error);
    });
  }
};

export const logout = async () => {
  ensureFirebaseReady();
  return signOut(auth);
};

export const resetPassword = (email) => {
  ensureFirebaseReady();
  return sendPasswordResetEmail(auth, email);
};

export const watchUser = (callback, onError) => {
  if (!auth || !db) {
    const error = getFirebaseSetupError() || new Error("Firebase is not configured. Add your Firebase web app config to js/firebase.js.");
    callback(null, null);
    if (onError) onError(error);
    return () => {};
  }

  let stopProfileListener = () => {};
  const stopAuthListener = onAuthStateChanged(auth, user => {
    stopProfileListener();
    if (!user) {
      callback(null, null, true);
      return;
    }

    const fallbackName = (user.displayName || "").split(" ");
    const fallbackProfile = {
      firstName: fallbackName[0] || user.email.split("@")[0],
      surname: fallbackName.slice(1).join(" "),
      email: user.email
    };
    callback(user, fallbackProfile, false);
    stopProfileListener = onSnapshot(doc(db, "users", user.uid), snapshot => {
      callback(user, snapshot.exists() ? snapshot.data() : null, true, snapshot.exists());
    }, error => {
      callback(user, null, true, false);
      if (onError) onError(error);
    });
  }, onError);

  return () => {
    stopProfileListener();
    stopAuthListener();
  };
};