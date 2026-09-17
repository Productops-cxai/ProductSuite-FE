import { useAuth } from "../../context/AuthContext";

export function TopBar() {
  const { user } = useAuth();
  const label =
    user?.role === "platform_super_admin" ? "Platform Super Admin" : user?.full_name || "User";

  return (
    <header className="topbar">
      <div className="topbar-hint">Platform administration — product entitlement only</div>
      <button type="button" className="role-pill" title={user?.email || ""}>
        <span className="dot" />
        {label}
      </button>
    </header>
  );
}
