import { useEffect, useState } from "react";
import { getApkDownloadUrl } from "../lib/appInstall";

export function useApkAvailability() {
  const apkUrl = getApkDownloadUrl();
  const customApkUrl = Boolean(import.meta.env.VITE_APK_DOWNLOAD_URL?.trim());
  const [apkReady, setApkReady] = useState<boolean | null>(customApkUrl ? true : null);

  useEffect(() => {
    if (customApkUrl) {
      setApkReady(true);
      return;
    }
    let cancelled = false;
    fetch(apkUrl, { method: "HEAD" })
      .then((r) => {
        if (!cancelled) setApkReady(r.ok);
      })
      .catch(() => {
        if (!cancelled) setApkReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apkUrl, customApkUrl]);

  return { apkUrl, apkReady };
}
