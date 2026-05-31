import { formatMobileDisplay } from "./phone.js";
import { getSmsApiKey, isSmsReady } from "./smsSettings.js";

const APIHOME_URL = "https://apihome.in/panel/api/bulksms/";

export class SmsNotConfiguredError extends Error {
  constructor() {
    super("SMS is not configured. Contact support.");
    this.name = "SmsNotConfiguredError";
  }
}

export class SmsSendError extends Error {
  constructor(message = "Failed to send SMS") {
    super(message);
    this.name = "SmsSendError";
  }
}

/** Send OTP via apihome.in — API key only from server DB (admin settings). */
export async function sendOtpSms(mobile: string, otp: string): Promise<{ sent: boolean; devMode: boolean }> {
  const ready = await isSmsReady();
  const apiKey = await getSmsApiKey();

  if (!ready || !apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[SMS DEV] To ${formatMobileDisplay(mobile)}: OTP ${otp}`);
      return { sent: true, devMode: true };
    }
    throw new SmsNotConfiguredError();
  }

  const url = new URL(APIHOME_URL);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("mobile", mobile);
  url.searchParams.set("otp", otp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("[SMS] apihome HTTP", res.status, body.slice(0, 200));
      throw new SmsSendError();
    }
    console.log(`[SMS] OTP sent to ${formatMobileDisplay(mobile)} via apihome`);
    return { sent: true, devMode: false };
  } catch (err) {
    if (err instanceof SmsSendError || err instanceof SmsNotConfiguredError) throw err;
    console.error("[SMS] apihome request failed", err);
    throw new SmsSendError();
  } finally {
    clearTimeout(timeout);
  }
}
