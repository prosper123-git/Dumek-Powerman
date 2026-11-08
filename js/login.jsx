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
  if (error?.message?.startsWith("Add your Firebase web app config")) return error.message;
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
    case "permission-denied": return "Your account may be signed in, but Firestore could not save or load its profile. Publish the Firestore rules from FIRESTORE_SETUP.md.";
    case "unavailable": return "Firebase is temporarily unavailable. Check your connection and try again.";
    default: return "Authentication failed. Check your Firebase setup and try again.";
  }
}

function AuthTabs({ mode, onChange }) {
  return (
    <div className="auth-tabs" role="tablist" aria-label="Account access">
      {[['login', 'Log in'], ['signup', 'Create account']].map(([value, label]) => (
        <button
          className={`auth-tab${mode === value ? " active" : ""}`}
          key={value}
          type="button"
          role="tab"
          aria-selected={mode === value}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function NameFields() {
  return (
    <div className="auth-name-fields">
      <label className="auth-field">
        First name
        <input name="firstName" type="text" autoComplete="given-name" placeholder="First name" required />
      </label>
      <label className="auth-field">
        Surname
        <input name="surname" type="text" autoComplete="family-name" placeholder="Surname" required />
      </label>
    </div>
  );
}

function AuthNotice({ notice }) {
  if (!notice) return null;
  return <p className="auth-notice visible" data-state={notice.state} role="status" aria-live="polite">{notice.message}</p>;
}

function AuthCard() {
  const [mode, setMode] = useState("login");
  const [notice, setNotice] = useState(null);
  const [pending, setPending] = useState(false);
  const { client, loadError } = useAuthClient();
  const emailRef = useRef(null);
  const signup = mode === "signup";

  function changeMode(nextMode) {
    setMode(nextMode);
    setNotice(null);
  }

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
      if (signup) {
        await client.signup(
          form.get("email").trim(),
          form.get("password"),
          form.get("firstName").trim(),
          form.get("surname").trim()
        );
        setNotice({ message: "Your account is ready. You are signed in.", state: "success" });
      } else {
        await client.login(form.get("email").trim(), form.get("password"));
        setNotice({ message: "You are signed in successfully.", state: "success" });
      }
    } catch (error) {
      const message = signup && error.code && !error.code.startsWith("auth/")
        ? `Your authentication account may have been created, but its Firestore profile could not be saved. ${authErrorMessage(error)}`
        : authErrorMessage(error);
      setNotice({ message, state: "error" });
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
      <AuthTabs mode={mode} onChange={changeMode} />
      <div className="auth-heading">
        <span className="eyebrow dark">{signup ? "GET STARTED" : "WELCOME BACK"}</span>
        <h2 id="authTitle">{signup ? "Create your account" : "Good to see you again."}</h2>
        <p>{signup ? "A few details and you’re all set." : "Sign in with your email and password."}</p>
      </div>
      <form onSubmit={handleSubmit}>
        {signup && <NameFields />}
        <label className="auth-field">
          Email address
          <input ref={emailRef} name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </label>
        <label className="auth-field">
          Password
          <input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength="8" placeholder="At least 8 characters" required />
        </label>
        {!signup && <button className="auth-reset" type="button" onClick={handleReset} disabled={pending}>Forgot password?</button>}
        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? (signup ? "Creating account..." : "Signing in...") : (signup ? "Create account" : "Log in")}
          {!pending && <span aria-hidden="true">→</span>}
        </button>
      </form>
      <AuthNotice notice={notice} />
      {signup && <p className="auth-terms">By creating an account, you agree to our terms and privacy policy.</p>}
    </section>
  );
}

export function AuthPage() {
  return (
    <div className="auth-layout">
      <section className="auth-aside">
        <span className="eyebrow"><span className="pulse" /> Your Dumek account</span>
        <h1>Powering your next <em>good day.</em></h1>
        <p>Sign in to keep your shopping experience simple. New here? Create an account in a moment.</p>
        <div className="auth-aside-note"><span>DP / 01</span><span>Dependable power starts here.</span></div>
      </section>
      <AuthCard />
    </div>
  );
}
