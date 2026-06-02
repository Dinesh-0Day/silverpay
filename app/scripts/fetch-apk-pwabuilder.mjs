#!/usr/bin/env node
/**
 * Download Android APK from PWABuilder cloud service (no local Android SDK).
 * Usage: node scripts/fetch-apk-pwabuilder.mjs [APP_URL]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const host = (process.argv[2] || process.env.APP_URL || "https://silverpay.live").replace(/\/$/, "");

const payload = {
  host,
  name: "SilverPay",
  shortName: "SilverPay",
  launcherName: "SilverPay",
  packageId: "live.silverpay.app",
  appVersion: "1.0.0",
  appVersionCode: "1",
  startUrl: "/",
  webManifestUrl: `${host}/manifest.webmanifest`,
  iconUrl: `${host}/icons/icon-512.png`,
  maskableIconUrl: `${host}/icons/icon-maskable-512.png`,
  monochromeIconUrl: null,
  themeColor: "#0f172a",
  themeColorDark: "#0f172a",
  backgroundColor: "#0f172a",
  navigationColor: "#0f172a",
  navigationColorDark: "#0f172a",
  navigationDividerColor: "#0f172a",
  navigationDividerColorDark: "#0f172a",
  display: "standalone",
  orientation: "portrait",
  fallbackType: "customtabs",
  signingMode: "none",
  enableNotifications: false,
  enableSiteSettingsShortcut: true,
  splashScreenFadeOutDuration: 300,
  chromeOSOnly: false,
  features: { locationDelegation: { enabled: true } },
};

const zipPath = path.join(appRoot, ".pwabuilder-package.zip");
const outApk = path.join(appRoot, "public", "silverpay.apk");

console.log(`Requesting APK package for ${host} …`);

const res = await fetch("https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/zip" },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`PWABuilder failed (${res.status}):`, text.slice(0, 500));
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(zipPath, buf);
console.log(`Downloaded ${(buf.length / 1024 / 1024).toFixed(2)} MB zip`);

const list = execSync(`unzip -l "${zipPath}"`, { encoding: "utf8" });
console.log(list);

const apkLine = list.split("\n").find((l) => l.includes(".apk") && !l.includes("unaligned"));
const apkName = apkLine?.trim().split(/\s+/).pop();
if (!apkName) {
  console.error("No .apk found in zip. Contents above.");
  process.exit(1);
}

execSync(`unzip -o -j "${zipPath}" "${apkName}" -d "${path.join(appRoot, "public")}"`, { stdio: "inherit" });
const extracted = path.join(appRoot, "public", path.basename(apkName));
if (extracted !== outApk) {
  fs.renameSync(extracted, outApk);
}

fs.unlinkSync(zipPath);
console.log(`\nAPK ready: ${outApk}`);
console.log("Commit and redeploy app service so users can download from /silverpay.apk");
