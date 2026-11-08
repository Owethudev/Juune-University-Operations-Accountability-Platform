import type { SessionUser } from "../app/auth/AuthContext.js";
import { useAuth } from "../app/auth/AuthContext.js";

const roleLabels: Record<SessionUser["role"], string> = {
  employee: "Employee",
  department_manager: "Department manager",
  senior_leadership: "Senior leadership",
  platform_admin: "Platform administrator",
};

export function ProfilePage({ user }: { user: SessionUser }) {
  const { signOut } = useAuth();

  return (
    <section className="profile-panel" aria-labelledby="profile-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h2 id="profile-heading">Profile information</h2>
        </div>
        <button className="button button-secondary" type="button" onClick={signOut}>
          Sign out
        </button>
      </div>
      <dl className="profile-details">
        <div className="profile-detail">
          <dt>Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div className="profile-detail">
          <dt>Institutional email</dt>
          <dd>{user.email}</dd>
        </div>
        {user.department && (
          <div className="profile-detail">
            <dt>Department</dt>
            <dd>{user.department}</dd>
          </div>
        )}
        <div className="profile-detail">
          <dt>Role</dt>
          <dd>{roleLabels[user.role]}</dd>
        </div>
      </dl>
      <p className="read-only-note">Profile information is managed by your institution.</p>
    </section>
  );
}
