import { useEffect, useRef, useState } from "react";
import { userApi, getErrorMessage, type SupportMessage } from "../api";
import ErrorAlert from "../components/ErrorAlert";
import PageStatus from "../components/PageStatus";

const QUICK_TOPICS = [
  { label: "Deposit issue", text: "Hi, I need help with my deposit. Order no: " },
  { label: "Withdrawal", text: "Hi, I have a question about my withdrawal request. " },
  { label: "Account / KYC", text: "Hi, I need help with my account or bank details. " },
  { label: "Referral / Team", text: "Hi, I need help with referral or my team. " },
];

function timeLabel(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function cleanMessageBody(body: string) {
  return body.replace(/^\[support-telegram-auto\]\n?/, "");
}

function extractTelegramUrl(text: string): string | null {
  const m = text.match(/https?:\/\/t\.me\/[^\s]+/i);
  return m?.[0] ?? null;
}

export default function Support() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [telegramUrl, setTelegramUrl] = useState("");
  const [telegramLabel, setTelegramLabel] = useState("Telegram");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = () =>
    userApi
      .supportMessages()
      .then((r) => {
        setMessages(r.messages ?? []);
        setTelegramUrl(r.telegramUrl?.trim() ?? "");
        setTelegramLabel(r.telegramLabel?.trim() || "Telegram");
        setLoadError("");
      })
      .catch((e) => setLoadError(getErrorMessage(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, sending]);

  const send = async (text?: string) => {
    const msg = (text ?? body).trim();
    if (!msg) return;
    setSending(true);
    setError("");
    try {
      await userApi.sendSupportMessage(msg);
      setBody("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Could not send message"));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send();
  };

  return (
    <div className="support-page">
      <header className="support-head">
        <div className="support-head-icon" aria-hidden>
          💬
        </div>
        <div>
          <h1>Live Support</h1>
          <p>Chat with SilverPay — we usually reply within minutes</p>
        </div>
        <span className="support-status-dot" title="Online" />
      </header>

      {telegramUrl && (
        <a
          href={telegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="support-telegram-banner"
        >
          <span className="support-telegram-banner-icon" aria-hidden>
            ✈️
          </span>
          <span className="support-telegram-banner-text">
            <strong>Fastest help on Telegram</strong>
            <span>Chat with {telegramLabel} — tap to open</span>
          </span>
          <span className="support-telegram-banner-cta">Open</span>
        </a>
      )}

      <div className="support-quick">
        {QUICK_TOPICS.map((topic) => (
          <button
            key={topic.label}
            type="button"
            className="support-quick-chip"
            onClick={() => {
              setBody(topic.text);
              inputRef.current?.focus();
            }}
          >
            {topic.label}
          </button>
        ))}
      </div>

      <PageStatus loading={loading && !messages.length} error={loadError} onRetry={load}>
        <div ref={chatRef} className="support-chat" role="log" aria-live="polite">
          {!messages.length && !loadError && (
            <div className="support-welcome">
              <p className="support-welcome-title">How can we help?</p>
              <p>Pick a topic above or type your message below.</p>
              {telegramUrl && (
                <p className="support-welcome-telegram">
                  After you send a message, we&apos;ll share our Telegram contact for instant chat.
                </p>
              )}
            </div>
          )}
          {messages.map((m) => {
            const isUser = m.sender === "USER";
            const isSystem = m.sender === "SYSTEM";
            const displayBody = cleanMessageBody(m.body);
            const msgTelegramUrl = isSystem ? extractTelegramUrl(displayBody) ?? telegramUrl : null;
            return (
              <div
                key={m.id}
                className={`support-bubble-row${isUser ? " is-user" : " is-staff"}${isSystem ? " is-system" : ""}`}
              >
                <div className={`support-bubble${isUser ? " is-user" : " is-staff"}${isSystem ? " is-system" : ""}`}>
                  <p className="support-bubble-text">{displayBody}</p>
                  {msgTelegramUrl && (
                    <a
                      href={msgTelegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="support-telegram-btn"
                    >
                      Open Telegram ({telegramLabel})
                    </a>
                  )}
                  {m.createdAt && <time className="support-bubble-time">{timeLabel(m.createdAt)}</time>}
                </div>
              </div>
            );
          })}
        </div>
      </PageStatus>

      <ErrorAlert message={error} />
      <form onSubmit={onSubmit} className="support-compose">
        <textarea
          ref={inputRef}
          className="support-input"
          rows={2}
          placeholder="Type your message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={sending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button type="submit" disabled={sending || !body.trim()} className="support-send">
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
