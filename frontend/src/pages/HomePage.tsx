import type { SessionUser } from "../app/auth/AuthContext.js";

export function HomePage({ user }: { user: SessionUser }) {
  return (
    <section className="welcome-panel" aria-labelledby="welcome-title">
      <p className="eyebrow">Your workspace</p>
      <h2 id="welcome-title">Welcome, {user.name}</h2>
      <p>Your role and access are managed by your institution.</p>
    </section>
  );
}
