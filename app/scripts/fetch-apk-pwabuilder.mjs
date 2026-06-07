#!/usr/bin/env node
/**
 * Download a signed Android APK from PWABuilder (no local Android SDK).
 * Also extracts assetlinks.json for TWA verification on the live domain.
 *
 * Usage: APP_URL=https://silverpay.live node scripts/fetch-apk-pwabuilder.mjs
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
  pwaUrl: host,
  name: "SilverPay",
  shortName: "SilverPay",
  launcherName: "SilverPay",
  packageId: "live.silverpay.app",
  appVersion: "1.0.1",
  appVersionCode: 2,
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
  signingMode: "new",
  signing: {
    file: null,
    alias: "silverpay",
    fullName: "SilverPay",
    organization: "SilverPay",
    organizationalUnit: "Mobile",
    countryCode: "IN",
    keyPassword: "",
    storePassword: "",
  },
  enableNotifications: false,
  enableSiteSettingsShortcut: true,
  includeSourceCode: false,
  splashScreenFadeOutDuration: 300,
  chromeOSOnly: false,
  minSdkVersion: 21,
  features: { locationDelegation: { enabled: true } },
};

const zipPath = path.join(appRoot, ".pwabuilder-package.zip");
const outApk = path.join(appRoot, "public", "silverpay-release.apk");
const assetLinksDir = path.join(appRoot, "public", ".well-known");
const assetLinksOut = path.join(assetLinksDir, "assetlinks.json");
const signingDir = path.join(appRoot, "android-signing");

console.log(`Requesting signed APK for ${host} …`);

const res = await fetch("https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/zip" },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`PWABuilder failed (${res.status}):`, text.slice(0, 800));
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(zipPath, buf);
console.log(`Downloaded ${(buf.length / 1024 / 1024).toFixed(2)} MB zip`);

const list = execSync(`unzip -l "${zipPath}"`, { encoding: "utf8" });
console.log(list);

const entries = list
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("Archive:") && !line.startsWith("Length") && !line.startsWith("---"))
  .map((line) => {
    const parts = line.split(/\s+/);
    return parts[parts.length - 1];
  })
  .filter((name) => name && name !== "Name" && !name.endsWith("/"));

const apkName =
  entries.find((n) => n.endsWith(".apk") && /signed/i.test(n) && !/unsigned/i.test(n)) ||
  entries.find((n) => n.endsWith(".apk") && !/unsigned/i.test(n)) ||
  entries.find((n) => n.endsWith(".apk"));

if (!apkName) {
  console.error("No .apk found in zip.");
  process.exit(1);
}

console.log(`Using APK: ${apkName}`);

const tmpApk = path.join(appRoot, ".pwabuilder-tmp.apk");
execSync(`unzip -p "${zipPath}" "${apkName}" > "${tmpApk}"`, { stdio: "inherit", shell: true });
fs.copyFileSync(tmpApk, outApk);
fs.unlinkSync(tmpApk);

const assetLinksName = entries.find((n) => n.endsWith("assetlinks.json"));
if (assetLinksName) {
  fs.mkdirSync(assetLinksDir, { recursive: true });
  execSync(`unzip -o -j "${zipPath}" "${assetLinksName}" -d "${assetLinksDir}"`, { stdio: "inherit" });
  console.log(`Asset links → ${assetLinksOut}`);
} else {
  console.warn("No assetlinks.json in package — TWA may open in browser tab until you add it.");
}

fs.mkdirSync(signingDir, { recursive: true });
for (const name of entries) {
  if (/signing/i.test(name) && (name.endsWith(".keystore") || name.endsWith(".txt") || name.endsWith(".json"))) {
    execSync(`unzip -o -j "${zipPath}" "${name}" -d "${signingDir}"`, { stdio: "inherit" });
  }
}

fs.unlinkSync(zipPath);

// Verify APK has signature blocks
const sigCheck = execSync(`unzip -l "${outApk}"`, { encoding: "utf8" });
const signed = /META-INF\/.*\.(RSA|DSA|EC|SF)/.test(sigCheck) || /META-INF\/MANIFEST\.MF/.test(sigCheck);
console.log(`\nAPK: ${outApk} (${(fs.statSync(outApk).size / 1024 / 1024).toFixed(2)} MB)`);
console.log(signed ? "Signature: present ✓" : "Signature: MISSING — install will fail on most phones");

if (!signed) {
  console.error("\nRebuild failed to produce a signed APK. Try PWABuilder UI with signing enabled.");
  process.exit(1);
}

// Keep legacy path in sync (signed copy)
fs.copyFileSync(outApk, path.join(appRoot, "public", "silverpay.apk"));

console.log("\nNext: commit public/silverpay-release.apk + public/silverpay.apk + assetlinks, push, redeploy app.");
