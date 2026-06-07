import { useEffect, useState } from "react";
import { useApkAvailability } from "../hooks/useApkAvailability";
import {
  isAndroidDevice,
  isIosDevice,
  isStandaloneDisplay,
  type BeforeInstallPromptEvent,
} from "../lib/appInstall";

export default function AppDownloadSection() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const { apkUrl, apkReady } = useApkAvailability();

  useEffect(() => {
    setInstalled(isStandaloneDisplay());
    const onInstall = () => setInstalled(true);
    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("appinstalled", onInstall);
    window.addEventListener("beforeinstallprompt", onBip);
    return () => {
      window.removeEventListener("appinstalled", onInstall);
      window.removeEventListener("beforeinstallprompt", onBip);
    };
  }, []);

  const installPwa = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  };

  if (installed) {
    return (
      <section className="profile-download" aria-label="App installed">
        <p className="profile-download-installed">App is installed on this device.</p>
      </section>
    );
  }

  const android = isAndroidDevice();
  const ios = isIosDevice();

  return (
    <section className="profile-download" aria-label="Download app">
      <h2 className="profile-menu-title">Get the app</h2>
      <div className="profile-download-card">
        <div className="profile-download-icon" aria-hidden>
          <img src="/icons/icon-192.png" alt="" width={48} height={48} />
        </div>
        <p className="profile-download-lead">Install SilverPay like a native app — same login, plans & wallet.</p>

        {apkReady === false ? (
          <p className="profile-download-hint mb-2">
            APK file is not on the server yet. After deploy, run{" "}
            <code className="text-[10px]">npm run build:apk</code> (see docs/APK_BUILD.md) or upload{" "}
            <code className="text-[10px]">public/silverpay-release.apk</code>.
          </p>
        ) : (
          <a
            href={apkUrl}
            download="SilverPay.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="profile-download-apk-btn"
          >
            Download APK (Android)
          </a>
        )}

        {installEvt && (
          <button type="button" className="profile-download-install-btn" onClick={() => void installPwa()}>
            Install app (quick)
          </button>
        )}

        {android && !installEvt && (
          <p className="profile-download-hint">
            Tip: Use <strong>Download APK</strong>, or Chrome menu → <strong>Install app</strong> / Add to Home screen.
          </p>
        )}

        {ios && (
          <p className="profile-download-hint">
            On iPhone: Safari → Share → <strong>Add to Home Screen</strong>.
          </p>
        )}

        {!android && !ios && (
          <p className="profile-download-hint">
            On mobile: open this site in Chrome (Android) to install or download APK.
          </p>
        )}
      </div>
    </section>
  );
}
