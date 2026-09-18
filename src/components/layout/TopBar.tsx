import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";

export function TopBar() {
  const { user, logout } = useAuth();
  const label =
    user?.role === "platform_super_admin" ? "Platform Super Admin" : user?.full_name || "User";

  return (
    <header className="topbar">
      <div className="topbar-hint">Platform administration — product entitlement only</div>
      <div className="topbar-right">
        <button type="button" className="role-pill" title={user?.email || ""}>
          <span className="dot" />
          {label}
        </button>
        <Button variant="secondary" size="sm" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
