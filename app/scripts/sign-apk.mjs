#!/usr/bin/env node
/**
 * Sign an unsigned APK locally (debug/release keystore).
 * Usage: node scripts/sign-apk.mjs [input.apk] [output.apk]
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const input = path.resolve(appRoot, process.argv[2] || "public/silverpay-unsigned.apk");
const output = path.resolve(appRoot, process.argv[3] || "public/silverpay.apk");
const signingDir = path.join(appRoot, "android-signing");
const keystore = path.join(signingDir, "silverpay.keystore");
const alias = "silverpay";
const storePass = process.env.APK_KEYSTORE_PASS || "silverpay2026";
const keyPass = storePass;

const javaHome = process.env.JAVA_HOME || "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home";
const androidHome = process.env.ANDROID_HOME || `${process.env.HOME}/Library/Android/sdk`;
const apksigner = `${androidHome}/build-tools/37.0.0/apksigner`;
const keytool = `${javaHome}/bin/keytool`;

if (!fs.existsSync(input)) {
  console.error(`Input APK not found: ${input}`);
  process.exit(1);
}

fs.mkdirSync(signingDir, { recursive: true });

if (!fs.existsSync(keystore)) {
  console.log("Creating release keystore…");
  execSync(
    `"${keytool}" -genkeypair -v -keystore "${keystore}" -alias ${alias} -keyalg RSA -keysize 2048 -validity 10000 -storepass ${storePass} -keypass ${keyPass} -dname "CN=SilverPay, OU=Mobile, O=SilverPay, L=India, ST=India, C=IN"`,
    { stdio: "inherit", env: { ...process.env, JAVA_HOME: javaHome } }
  );
}

console.log("Signing APK…");
execSync(
  `"${apksigner}" sign --ks "${keystore}" --ks-key-alias ${alias} --ks-pass pass:${storePass} --key-pass pass:${keyPass} --out "${output}" "${input}"`,
  { stdio: "inherit", env: { ...process.env, JAVA_HOME: javaHome } }
);

execSync(`"${apksigner}" verify --verbose "${output}"`, {
  stdio: "inherit",
  env: { ...process.env, JAVA_HOME: javaHome },
});

console.log(`Signed APK: ${output}`);
