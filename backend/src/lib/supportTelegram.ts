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

export function buildSupportTelegramAutoReplyText(): string {
  return [
    "Thanks for your message!",
    "",
    "For faster support, continue on Telegram.",
    "Tap the button below to open our support chat.",
  ].join("\n");
}

/** Embed Telegram URL in message so the app can always render a clickable button. */
export function buildSupportTelegramAutoReply(url: string): string {
  return `[[TG:${url}]]\n${buildSupportTelegramAutoReplyText()}`;
}

/** Pull Telegram URL from stored auto-reply body (supports legacy __TG__ formats). */
export function parseEmbeddedTelegramUrl(body: string): string | null {
  const tagged = body.match(/\[\[TG:([^\]]+)\]\]/);
  if (tagged?.[1]) return tagged[1].trim();

  const legacyClosed = body.match(/^__TG__(https?:\/\/[^\s\n]+)__/);
  if (legacyClosed?.[1]) return legacyClosed[1].trim();

  const legacyOpen = body.match(/^__TG__(https?:\/\/[^\s\n]+)/);
  if (legacyOpen?.[1]) return legacyOpen[1].trim();

  const inline = body.match(/https?:\/\/t\.me\/[^\s\n]+/i);
  return inline?.[0]?.trim() ?? null;
}

/** Remove machine-readable Telegram embed from message body for display. */
export function stripTelegramEmbed(body: string): string {
  let text = body
    .replace(/\[\[TG:[^\]]+\]\]\n?/, "")
    .replace(/^__TG__https?:\/\/[^\s\n]+(?:__)?\n?/, "")
    .replace(/^\[support-telegram-auto\]\s*/i, "")
    .replace(/https?:\/\/t\.me\/[^\s\n]+/gi, "")
    .replace(/For faster support, chat with us on Telegram\s*\([^)]*\):?/gi, "")
    .replace(/Tap the link above[^\n]*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) return buildSupportTelegramAutoReplyText();
  return text;
}
