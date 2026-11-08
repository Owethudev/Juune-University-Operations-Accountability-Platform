import { useState } from "react";
import { Link } from "react-router-dom";
import { NotificationToast } from "../components/NotificationToast.js";

export function SignInPage() {
  const [signInFailed, setSignInFailed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionRequired, setConnectionRequired] = useState(false);

  async function beginInstitutionalSignIn() {
    setSignInFailed(false);
    setConnectionRequired(false);
    if (!navigator.onLine) {
      setConnectionRequired(true);
      return;
    }

    setIsConnecting(true);

    try {
      const baseUrl = import.meta.env.DEV
        ? "/api/v1"
        : (import.meta.env.VITE_API_BASE_URL ?? "/api/v1");
      await fetch(`${baseUrl.replace(/\/$/, "")}/auth/start`, {
        method: "POST",
      });
      setSignInFailed(true);
    } catch {
      setSignInFailed(true);
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <main className="sign-in-page">
      <section className="sign-in-card" aria-labelledby="sign-in-title">
        <Link className="brand sign-in-brand" to="/" aria-label="Juune">
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span>Juune</span>
        </Link>
        <p className="eyebrow">University operations</p>
        <h1 id="sign-in-title">Sign in</h1>
        <p className="sign-in-description">
          Sign in with your institution to continue to Juune.
        </p>
        {signInFailed && (
          <NotificationToast
            message="We couldn’t sign you in. Check your institutional account or contact your university support team."
            variant="error"
            persistent
          />
        )}
        {connectionRequired && (
          <div className="offline-banner" role="status">
            A connection is required to sign in. Reconnect and try again.
          </div>
        )}
        <button
          className="button button-primary sign-in-button"
          type="button"
          onClick={() => void beginInstitutionalSignIn()}
          disabled={isConnecting}
        >
          {isConnecting
            ? "Connecting to your institution…"
            : "Sign in with your institution"}
        </button>
        <p className="sign-in-support">
          For help, contact your university support team.
        </p>
      </section>
    </main>
  );
}
