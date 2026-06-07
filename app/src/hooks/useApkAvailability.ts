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
    const bustUrl = `${apkUrl}${apkUrl.includes("?") ? "&" : "?"}cb=1`;
    fetch(bustUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Range: "bytes=0-0" },
    })
      .then((r) => {
        if (!cancelled) setApkReady(r.ok || r.status === 206);
      })
      .catch(() => {
        // Allow download attempt even if availability probe fails (e.g. SW cache).
        if (!cancelled) setApkReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apkUrl, customApkUrl]);

  return { apkUrl, apkReady };
}
