import { useEffect, useMemo, useRef, useState } from "react";
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

function telegramLabelFromUrl(url: string): string {
  const m = url.match(/t\.me\/([^/?#]+)/i);
  if (!m?.[1]) return "Telegram Support";
  const slug = decodeURIComponent(m[1]);
  if (slug.startsWith("+") || slug.startsWith("joinchat")) return "Telegram Support";
  return `@${slug}`;
}

function extractUrlFromBody(body: string): string | null {
  const tagged = body.match(/\[\[TG:([^\]]+)\]\]/);
  if (tagged?.[1]) return tagged[1].trim();

  const legacyClosed = body.match(/^__TG__(https?:\/\/[^\s\n]+)__/);
  if (legacyClosed?.[1]) return legacyClosed[1].trim();

  const legacyOpen = body.match(/^__TG__(https?:\/\/[^\s\n]+)/);
  if (legacyOpen?.[1]) return legacyOpen[1].trim();

  return body.match(/https?:\/\/t\.me\/[^\s\n]+/i)?.[0]?.trim() ?? null;
}

function formatAutoReplyText(body: string): string {
  let text = body
    .replace(/\[\[TG:[^\]]+\]\]\n?/, "")
    .replace(/^__TG__https?:\/\/[^\s\n]+(?:__)?\n?/, "")
    .replace(/^\[support-telegram-auto\]\s*/i, "")
    .replace(/https?:\/\/t\.me\/[^\s\n]+/gi, "")
    .replace(/For faster support, chat with us on Telegram\s*\([^)]*\):?/gi, "")
    .replace(/Tap the link above[^\n]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) {
    text =
      "Thanks for your message!\n\nFor faster support, continue on Telegram.\nTap the button below to open our support chat.";
  }
  return text;
}

function isTelegramAutoMessage(m: SupportMessage) {
  if (m.sender === "SYSTEM") return true;
  return (
    /\[\[TG:[^\]]+\]\]/.test(m.body) ||
    /^__TG__https?:\/\//m.test(m.body) ||
    /\[support-telegram-auto\]/i.test(m.body) ||
    /https?:\/\/t\.me\//i.test(m.body) ||
    /continue on Telegram/i.test(m.body)
  );
}

function TelegramChatButton({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="support-telegram-btn"
      onClick={(e) => e.stopPropagation()}
    >
      ✈️ Chat on {label}
    </a>
  );
}

export default function Support() {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [telegramUrl, setTelegramUrl] = useState("");
  const [telegramLabel, setTelegramLabel] = useState("Telegram Support");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const applyTelegramUrl = (url: string, label?: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setTelegramUrl(trimmed);
    setTelegramLabel(label?.trim() || telegramLabelFromUrl(trimmed));
  };

  const load = () =>
    Promise.all([userApi.supportMessages(), userApi.cryptoSettings().catch(() => null)])
      .then(([support, settings]) => {
        setMessages(support.messages ?? []);
        const supportUrl = support.telegramUrl?.trim() ?? "";
        const settingsUrl = settings?.supportTelegramUrl?.trim() ?? "";
        applyTelegramUrl(supportUrl || settingsUrl, support.telegramLabel);
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

  const resolvedTelegramUrl = useMemo(() => {
    if (telegramUrl) return telegramUrl;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const fromMsg = m.telegramUrl?.trim() || extractUrlFromBody(m.body);
      if (fromMsg) return fromMsg;
    }
    return "";
  }, [telegramUrl, messages]);

  const resolvedLabel = useMemo(
    () => (resolvedTelegramUrl ? telegramLabelFromUrl(resolvedTelegramUrl) : telegramLabel),
    [resolvedTelegramUrl, telegramLabel]
  );

  const hasUserMessage = messages.some((m) => m.sender === "USER");

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

      {resolvedTelegramUrl && (
        <a
          href={resolvedTelegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="support-telegram-banner"
        >
          <span className="support-telegram-banner-icon" aria-hidden>
            ✈️
          </span>
          <span className="support-telegram-banner-text">
            <strong>Fastest help on Telegram</strong>
            <span>Chat with {resolvedLabel}</span>
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
            </div>
          )}
          {messages.map((m) => {
            const isUser = m.sender === "USER";
            const isTelegramAuto = isTelegramAutoMessage(m);
            const msgUrl =
              m.telegramUrl?.trim() || extractUrlFromBody(m.body) || resolvedTelegramUrl;
            const displayBody = isTelegramAuto ? formatAutoReplyText(m.body) : m.body;
            const msgLabel = msgUrl ? telegramLabelFromUrl(msgUrl) : resolvedLabel;

            return (
              <div
                key={m.id}
                className={`support-bubble-row${isUser ? " is-user" : " is-staff"}${isTelegramAuto ? " is-system" : ""}`}
              >
                <div
                  className={`support-bubble${isUser ? " is-user" : " is-staff"}${isTelegramAuto ? " is-system" : ""}`}
                >
                  <p className="support-bubble-text">{displayBody}</p>
                  {isTelegramAuto && msgUrl ? <TelegramChatButton url={msgUrl} label={msgLabel} /> : null}
                  {m.createdAt && <time className="support-bubble-time">{timeLabel(m.createdAt)}</time>}
                </div>
              </div>
            );
          })}
        </div>
      </PageStatus>

      {resolvedTelegramUrl ? (
        <a
          href={resolvedTelegramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="support-telegram-compose-cta"
        >
          ✈️ {hasUserMessage ? "Continue on Telegram" : "Chat on Telegram"} — {resolvedLabel}
        </a>
      ) : null}

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
