import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  doc, getDoc, onSnapshot, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export const signup = async (email, pw, firstName, surname) => {
  const credential = await createUserWithEmailAndPassword(auth, email, pw);
  const displayName = [firstName, surname].filter(Boolean).join(" ");
  await updateProfile(credential.user, { displayName });
  await setDoc(doc(db, "users", credential.user.uid), {
    firstName,
    surname,
    email: credential.user.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return credential;
};

export const login = async (email, pw) => {
  const credential = await signInWithEmailAndPassword(auth, email, pw);
  const profileRef = doc(db, "users", credential.user.uid);
  const profile = await getDoc(profileRef);
  if (!profile.exists()) {
    const [firstName, ...surnameParts] = (credential.user.displayName || "").split(" ");
    await setDoc(profileRef, {
      firstName: firstName || credential.user.email.split("@")[0],
      surname: surnameParts.join(" "),
      email: credential.user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
  return credential;
};

export const logout = () => signOut(auth);
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

export const watchUser = (callback, onError) => {
  let stopProfileListener = () => {};
  const stopAuthListener = onAuthStateChanged(auth, user => {
    stopProfileListener();
    if (!user) {
      callback(null, null);
      return;
    }

    const fallbackName = (user.displayName || "").split(" ");
    const fallbackProfile = {
      firstName: fallbackName[0] || user.email.split("@")[0],
      surname: fallbackName.slice(1).join(" "),
      email: user.email
    };
    stopProfileListener = onSnapshot(doc(db, "users", user.uid), snapshot => {
      callback(user, snapshot.exists() ? snapshot.data() : fallbackProfile);
    }, error => {
      callback(user, fallbackProfile);
      onError(error);
    });
  }, onError);

  return () => {
    stopProfileListener();
    stopAuthListener();
  };
};