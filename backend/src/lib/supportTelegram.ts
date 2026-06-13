/** Normalize @username, t.me/foo, or full https URL to a Telegram link. */
export function normalizeTelegramUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("@")) return `https://t.me/${s.slice(1)}`;
  if (s.startsWith("t.me/")) return `https://${s}`;
  return `https://t.me/${s.replace(/^\/+/, "")}`;
}

export function telegramDisplayLabel(url: string): string {
  const m = url.match(/t\.me\/([^/?#]+)/i);
  if (m?.[1]) return `@${m[1]}`;
  return "Telegram";
}

export function buildSupportTelegramAutoReply(url: string): string {
  const label = telegramDisplayLabel(url);
  return [
    "Thanks for your message!",
    "",
    `For faster support, chat with us on Telegram (${label}):`,
    url,
    "",
    "Tap the link above to open Telegram and continue there.",
  ].join("\n");
}

export const SUPPORT_TELEGRAM_AUTO_MARKER = "[support-telegram-auto]";
