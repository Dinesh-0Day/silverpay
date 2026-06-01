import { useApkAvailability } from "../hooks/useApkAvailability";

export default function TopbarApkDownload() {
  const { apkUrl, apkReady } = useApkAvailability();

  const title =
    apkReady === false
      ? "APK not available yet"
      : apkReady === null
        ? "Checking APK…"
        : "Download SilverPay APK";

  return (
    <a
      href={apkUrl}
      download="SilverPay.apk"
      className={`app-topbar-apk-btn${apkReady !== true ? " is-disabled" : ""}`}
      title={title}
      aria-label="Download APK"
      aria-disabled={apkReady !== true}
      onClick={(e) => {
        if (apkReady !== true) e.preventDefault();
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v12m0 0l4-4m-4 4l-4-4M5 19h14"
        />
      </svg>
      <span>APK</span>
    </a>
  );
}
