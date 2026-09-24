import { ProductSwitcher } from "../ProductSwitcher";
import { useAuth } from "../../context/AuthContext";

export function TopBar() {
  const { isSuperAdmin } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-hint">
        Platform administration · <em>product entitlement only</em>
      </div>
      <div className="topbar-right">
        {isSuperAdmin ? (
          <ProductSwitcher current="platform" variant="platform" />
        ) : (
          <button type="button" className="role-pill">
            <span className="dot" />
            User
          </button>
        )}
      </div>
    </header>
  );
}
