import { Link } from "react-router-dom";

export function AccessDeniedPage() {
  return (
    <main className="access-denied-page">
      <section className="access-denied-card">
        <p className="eyebrow">Access restricted</p>
        <h1>You don’t have permission to view this item.</h1>
        <Link className="button button-primary" to="/">
          Return to Home
        </Link>
      </section>
    </main>
  );
}
