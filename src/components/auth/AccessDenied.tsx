import { Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";

type Props = {
  title?: string;
  message: string;
  /** Link back to product launcher when the user still has other products */
  showProductsLink?: boolean;
};

/** Shared deny screen for platform admin and product route guards. */
export function AccessDenied({
  title = "Access denied",
  message,
  showProductsLink = true,
}: Props) {
  const { user, logout, isSuperAdmin } = useAuth();

  return (
    <div className="launcher-page">
      <header className="launcher-top">
        <div className="launcher-brand">
          <img src="/assets/payflow-mark.png" alt="" className="platform-mark-img" />
          <strong>Platform Suite</strong>
        </div>
        <div className="launcher-top-actions">
          {user ? (
            <span className="launcher-user-chip" title={user.email}>
              {user.full_name}
            </span>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="launcher-main narrow">
        <p className="launcher-kicker">AUTHORIZATION</p>
        <h1>{title}</h1>
        <p className="launcher-lead">{message}</p>
        <div className="access-denied-actions">
          {showProductsLink ? (
            <Link
              to={isSuperAdmin ? "/platform" : "/products"}
              className="btn btn-primary"
            >
              {isSuperAdmin ? "Open Platform administration" : "Back to products"}
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}
