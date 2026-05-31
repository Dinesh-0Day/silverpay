import { Link } from "react-router-dom";

export default function NotFound() {
  const loggedIn = !!localStorage.getItem("userToken");

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <p className="not-found-code" aria-hidden>
          404
        </p>
        <h1 className="not-found-title">Page not found</h1>
        <p className="not-found-text">
          This page doesn&apos;t exist or may have been moved. Check the link or go back home.
        </p>
        <div className="not-found-actions">
          <Link to={loggedIn ? "/" : "/login"} className="not-found-btn">
            {loggedIn ? "Go to Home" : "Go to Login"}
          </Link>
          {loggedIn ? (
            <Link to="/deposits" className="not-found-link">
              Browse deposits
            </Link>
          ) : (
            <Link to="/register" className="not-found-link">
              Create account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
