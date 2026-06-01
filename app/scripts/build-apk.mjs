#!/usr/bin/env node
/**
 * Build Android APK (TWA) from the deployed PWA manifest using Bubblewrap.
 *
 * Prerequisites: JDK 17+, Android SDK, and a LIVE HTTPS URL for the user app.
 *
 * Usage:
 *   APP_URL=https://your-app.up.railway.app npm run build:apk
 *
 * Output: app/android-twa/ and copies release APK to public/silverpay.apk when found.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
const manifestUrl = appUrl ? `${appUrl}/manifest.webmanifest` : "";

if (!manifestUrl) {
  console.error("Set APP_URL to your deployed user app (HTTPS), e.g.:");
  console.error("  APP_URL=https://silverpay-app.up.railway.app npm run build:apk");
  process.exit(1);
}

const twaDir = path.join(appRoot, "android-twa");

console.log("Building web app…");
execSync("npm run build", { cwd: appRoot, stdio: "inherit" });

console.log(`Initializing TWA from ${manifestUrl} …`);
if (!fs.existsSync(twaDir)) {
  fs.mkdirSync(twaDir, { recursive: true });
  execSync(
    `npx --yes @bubblewrap/cli@latest init --manifest "${manifestUrl}" --directory "${twaDir}"`,
    { cwd: appRoot, stdio: "inherit" }
  );
}

console.log("Building APK (requires Android SDK)…");
execSync("npx --yes @bubblewrap/cli@latest build", { cwd: twaDir, stdio: "inherit" });

const candidates = [
  path.join(twaDir, "app", "build", "outputs", "apk", "release", "app-release-signed.apk"),
  path.join(twaDir, "app", "build", "outputs", "apk", "release", "app-release-unsigned.apk"),
];

const outApk = path.join(appRoot, "public", "silverpay.apk");
for (const src of candidates) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, outApk);
    fs.copyFileSync(src, path.join(appRoot, "dist", "silverpay.apk"));
    console.log(`\nAPK copied to public/silverpay.apk and dist/silverpay.apk`);
    console.log("Commit public/silverpay.apk or set VITE_APK_DOWNLOAD_URL to a CDN URL.");
    process.exit(0);
  }
}

console.log("\nBuild finished but APK not found at expected paths. Check android-twa/app/build/outputs/apk/");
