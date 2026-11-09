import { useState } from "react";
import { Link } from "react-router-dom";
import { NotificationToast } from "../components/NotificationToast.js";
import { useAuth, type UserRole } from "../app/auth/AuthContext.js";

export function SignInPage() {
  const {
    demoMode,
    demoAvailability = "disabled",
    retryDemoDetection,
    signInDemo,
  } = useAuth();
  const [signInFailed, setSignInFailed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionRequired, setConnectionRequired] = useState(false);
  const [demoRole, setDemoRole] = useState<UserRole>("employee");

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

  async function beginDemoSignIn() {
    setSignInFailed(false);
    setIsConnecting(true);
    try {
      if (!signInDemo) throw new Error("Demo sign-in is not enabled.");
      await signInDemo(demoRole);
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
          {demoMode
            ? "Explore Juune using a synthetic demo account."
            : demoAvailability === "checking"
              ? "Checking the available sign-in options…"
              : demoAvailability === "unavailable"
                ? "The Juune server could not be reached."
                : "Sign in with your institution to continue to Juune."}
        </p>
        {signInFailed && (
          <NotificationToast
            message={
              demoMode
                ? "Demo sign-in is unavailable. Try again or contact the demo administrator."
                : "We couldn’t sign you in. Check your institutional account or contact your university support team."
            }
            variant="error"
            persistent
          />
        )}
        {connectionRequired && (
          <div className="offline-banner" role="status">
            A connection is required to sign in. Reconnect and try again.
          </div>
        )}
        {demoAvailability === "checking" ? (
          <button
            className="button button-primary sign-in-button"
            type="button"
            disabled
          >
            Checking sign-in options…
          </button>
        ) : demoAvailability === "unavailable" ? (
          <>
            <div className="offline-banner" role="alert">
              Couldn’t check demo availability. Verify the backend URL and its
              CORS settings, then retry.
            </div>
            <button
              className="button button-primary sign-in-button"
              type="button"
              onClick={retryDemoDetection}
            >
              Retry connection
            </button>
          </>
        ) : demoMode ? (
          <>
            <label className="form-field">
              Demo role
              <select
                value={demoRole}
                onChange={(event) => {
                  if (isUserRole(event.target.value)) {
                    setDemoRole(event.target.value);
                  }
                }}
              >
                <option value="employee">Employee</option>
                <option value="department_manager">Department manager</option>
                <option value="senior_leadership">Senior leadership</option>
                <option value="platform_admin">Platform administrator</option>
              </select>
            </label>
            <div className="offline-banner" role="note">
              Demo mode uses synthetic, in-memory data only. It is not for
              confidential information or real university operations.
            </div>
            <button
              className="button button-primary sign-in-button"
              type="button"
              onClick={() => void beginDemoSignIn()}
              disabled={isConnecting}
            >
              {isConnecting ? "Opening demo…" : "Continue to demo"}
            </button>
          </>
        ) : (
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
        )}
        <p className="sign-in-support">
          {demoMode
            ? "Demo changes are temporary and reset when the backend restarts."
            : "For help, contact your university support team."}
        </p>
      </section>
    </main>
  );
}

function isUserRole(value: string): value is UserRole {
  return (
    value === "employee" ||
    value === "department_manager" ||
    value === "senior_leadership" ||
    value === "platform_admin"
  );
}
