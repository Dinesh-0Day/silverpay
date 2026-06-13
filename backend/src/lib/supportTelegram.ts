/** Normalize @username, t.me/foo, or full https URL to a Telegram link. */
export function normalizeTelegramUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("@")) return `https://t.me/${s.slice(1)}`;
  if (s.startsWith("t.me/")) return `https://${s}`;
  return `https://t.me/${s.replace(/^\/+/, "")}`;
}

/** Human label for banner/button — handles @user and private invite links (t.me/+xxx). */
export function telegramDisplayLabel(url: string): string {
  const m = url.match(/t\.me\/([^/?#]+)/i);
  if (!m?.[1]) return "Telegram Support";
  const slug = decodeURIComponent(m[1]);
  if (slug.startsWith("+") || slug.startsWith("joinchat")) return "Telegram Support";
  return `@${slug}`;
}

export function buildSupportTelegramAutoReply(): string {
  return [
    "Thanks for your message!",
    "",
    "For faster support, continue on Telegram.",
    "Tap the button below to open our support chat.",
  ].join("\n");
}
