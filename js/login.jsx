import { useEffect, useRef, useState } from "react";

function useAuthClient() {
  const [client, setClient] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let active = true;
    import("./auth.js").then(module => {
      if (active) setClient(module);
    }).catch(error => {
      if (active) setLoadError(error);
    });
    return () => { active = false; };
  }, []);

  return { client, loadError };
}

function authErrorMessage(error) {
  if (error?.message?.startsWith("Add your Firebase web app config") || error?.message?.startsWith("Firebase is not configured")) return error.message;
  switch (error?.code) {
    case "auth/email-already-in-use": return "An account already uses this email. Try logging in instead.";
    case "auth/invalid-email": return "Enter a valid email address.";
    case "auth/weak-password": return "Choose a stronger password with at least 8 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "Email or password is incorrect.";
    case "auth/operation-not-allowed": return "Email/password sign-in is disabled. Enable it in Firebase Console under Authentication > Sign-in method.";
    case "auth/unauthorized-domain": return "This site is not authorized in Firebase. Add its domain under Authentication settings.";
    case "auth/invalid-api-key": return "Firebase rejected the API key. Check the web app config in js/firebase.js.";
    case "auth/too-many-requests": return "Too many attempts. Wait a little and try again.";
    case "auth/network-request-failed": return "Network error. Check your connection and try again.";
    case "staff/profile-not-found": return error.message;
    case "staff/role-not-authorized": return error.message;
    case "permission-denied": return "Your account may be signed in, but Firestore could not save or load its profile. Publish the Firestore rules from FIRESTORE_SETUP.md.";
    case "unavailable": return "Firebase is temporarily unavailable. Check your connection and try again.";
    default: return "Authentication failed. Check your Firebase setup and try again.";
  }
}

function AuthNotice({ notice }) {
  if (!notice) return null;
  return <p className="auth-notice visible" data-state={notice.state} role="status" aria-live="polite">{notice.message}</p>;
}

function AuthCard() {
  const [notice, setNotice] = useState(null);
  const [pending, setPending] = useState(false);
  const { client, loadError } = useAuthClient();
  const emailRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!client) {
      setNotice({ message: loadError ? authErrorMessage(loadError) : "Account services are still loading. Try again in a moment.", state: "error" });
      return;
    }

    const form = new FormData(event.currentTarget);
    setPending(true);
    setNotice(null);
    try {
      const result = await client.login(form.get("email").trim(), form.get("password"));
      setNotice({
        message: result.activityError
          ? "You are signed in, but your sign-in time could not be recorded. Please contact the manager."
          : "You are signed in successfully.",
        state: result.activityError ? "error" : "success"
      });
    } catch (error) {
      setNotice({ message: authErrorMessage(error), state: "error" });
    } finally {
      setPending(false);
    }
  }

  async function handleReset() {
    const email = emailRef.current.value.trim();
    if (!email) {
      emailRef.current.focus();
      emailRef.current.reportValidity();
      return;
    }
    if (!client) {
      setNotice({ message: loadError ? authErrorMessage(loadError) : "Account services are still loading. Try again in a moment.", state: "error" });
      return;
    }

    setPending(true);
    setNotice({ message: "Sending password reset email...", state: "" });
    try {
      await client.resetPassword(email);
      setNotice({ message: "If an account exists for that email, a password reset link is on its way.", state: "success" });
    } catch (error) {
      setNotice({ message: authErrorMessage(error), state: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="authTitle">
      <div className="auth-heading">
        <span className="eyebrow dark">STAFF ACCESS</span>
        <h2 id="authTitle">Staff sign in</h2>
        <p>Sign in with the account provided by your store manager.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <label className="auth-field">
          Email address
          <input ref={emailRef} name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </label>
        <label className="auth-field">
          Password
          <input name="password" type="password" autoComplete="current-password" minLength="8" placeholder="Enter your password" required />
        </label>
        <button className="auth-reset" type="button" onClick={handleReset} disabled={pending}>Forgot password?</button>
        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Log in"}
          {!pending && <span aria-hidden="true">→</span>}
        </button>
      </form>
      <AuthNotice notice={notice} />
    </section>
  );
}

export function AuthPage() {
  return (
    <div className="auth-layout">
      <section className="auth-aside">
        <span className="eyebrow"><span className="pulse" /> Staff access</span>
        <h1>Powering your next <em>good day.</em></h1>
        <p>Sign in with the account provided by your store manager. Contact the manager if you need access.</p>
        <div className="auth-aside-note"><span>DP / 01</span><span>Dependable power starts here.</span></div>
      </section>
      <AuthCard />
    </div>
  );
}
