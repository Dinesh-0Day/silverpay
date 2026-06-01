/** Public APK path (place file at app/public/silverpay.apk or set VITE_APK_DOWNLOAD_URL). */
export function getApkDownloadUrl(): string {
  const custom = (import.meta.env.VITE_APK_DOWNLOAD_URL as string | undefined)?.trim();
  if (custom) return custom;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/silverpay.apk`;
  }
  return "/silverpay.apk";
}

export function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
