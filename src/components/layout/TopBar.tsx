import { Button } from "../ui/Button";
import { ProductSwitcher } from "../ProductSwitcher";
import { useAuth } from "../../context/AuthContext";

export function TopBar() {
  const { logout, isSuperAdmin } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-hint">Platform administration — product entitlement only</div>
      <div className="topbar-right">
        {isSuperAdmin ? (
          <ProductSwitcher current="platform" variant="platform" />
        ) : (
          <button type="button" className="role-pill">
            <span className="dot" />
            User
          </button>
        )}
        <Button variant="secondary" size="sm" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
