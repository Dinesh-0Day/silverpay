/** Strip +91 / 91 / leading 0 while typing; keep up to 10 national digits. */
export function parseIndianMobileInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length > 2) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length > 1) digits = digits.slice(1);
  return digits.slice(0, 10);
}

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

export function isValidIndianMobile(ten: string) {
  return /^[6-9]\d{9}$/.test(ten);
}
