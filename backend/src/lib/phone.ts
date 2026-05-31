/** Normalize Indian mobile to 10 digits (6–9 start). Accepts +91, 91, or leading 0. */
export function normalizeIndianMobile(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("91") && digits.length >= 12) digits = digits.slice(-10);
  else if (digits.startsWith("91") && digits.length > 10) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length >= 11) digits = digits.slice(1, 11);
  else if (digits.length > 10) digits = digits.slice(-10);
  if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) return null;
  return digits;
}

export function formatMobileDisplay(mobile: string) {
  if (mobile.length === 10) return `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`;
  return mobile;
}
