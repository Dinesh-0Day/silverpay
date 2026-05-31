import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userApi, getErrorMessage, type UserNotification } from "../api";
import PageStatus from "../components/PageStatus";

function timeLabel(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Notifications() {
  const [items, setItems] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    return userApi
      .notifications()
      .then((r) => setItems(r.items ?? []))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void load();
    void userApi.notificationsReadAll().catch(() => undefined);
  }, []);

  return (
    <div>
      <Link to="/" className="app-back-link mb-2">
        ← Home
      </Link>
      <h2 className="app-page-title">Notifications</h2>

      <PageStatus loading={loading} error={error} onRetry={load}>
        {!items.length ? (
          <div className="notify-empty">
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="notify-list">
            {items.map((n) => (
              <article key={n.id} className={`notify-row${n.read ? "" : " is-unread"}`}>
                {!n.read && <span className="notify-dot" aria-hidden />}
                <div className="notify-body">
                  <p className="notify-title">{n.title}</p>
                  {n.body ? <p className="notify-text">{n.body}</p> : null}
                  <p className="notify-time">{timeLabel(n.createdAt)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageStatus>
    </div>
  );
}
