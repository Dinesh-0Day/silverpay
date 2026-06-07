#!/usr/bin/env node
/**
 * Generate assetlinks.json from local keystore for TWA.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const signingDir = path.join(appRoot, "android-signing");
const keystore = path.join(signingDir, "silverpay.keystore");
const alias = "silverpay";
const storePass = process.env.APK_KEYSTORE_PASS || "silverpay2026";
const packageId = process.env.APK_PACKAGE_ID || "live.silverpay.app";
const javaHome = process.env.JAVA_HOME || "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home";
const keytool = `${javaHome}/bin/keytool`;

if (!fs.existsSync(keystore)) {
  console.error("Keystore not found. Run sign-apk.mjs first.");
  process.exit(1);
}

const out = execSync(
  `"${keytool}" -list -v -keystore "${keystore}" -alias ${alias} -storepass ${storePass}`,
  { encoding: "utf8", env: { ...process.env, JAVA_HOME: javaHome } }
);

const sha256 = out.match(/SHA256:\s*([A-F0-9:]+)/i)?.[1]?.replace(/:/g, "")?.toLowerCase();
if (!sha256) {
  console.error("Could not read SHA256 fingerprint from keystore");
  process.exit(1);
}

const assetLinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageId,
      sha256_cert_fingerprints: [sha256],
    },
  },
];

const dir = path.join(appRoot, "public", ".well-known");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, "assetlinks.json");
fs.writeFileSync(file, JSON.stringify(assetLinks, null, 2) + "\n");
console.log(`Wrote ${file}`);
console.log(`SHA256: ${sha256}`);
