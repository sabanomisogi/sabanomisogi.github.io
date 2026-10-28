// Encrypt the bonus files for a password-protected download page.
//
//   node tools/encrypt.mjs <source folder> <output folder>
//
// The password is read from the BONUS_PASSWORD environment variable, or asked for.
// Every file directly inside the source folder is encrypted (dotfiles and labels.json are skipped).
// An optional labels.json in the source folder maps a file name to a short description.
// The output folder is emptied of old *.bin files, then gets index.json, manifest.bin and one .bin per file.
//
// Format: PBKDF2-SHA256 (salt in index.json) -> AES-256-GCM. Each .bin is a 12-byte IV followed by the ciphertext.
// The pages (unlock.v3.js) must use the same normalizePassword().

import { webcrypto as crypto } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";

const ITERATIONS = 600000;

// Full-width input, stray spaces and letter case should not lock anyone out.
export function normalizePassword(s) {
  return s.normalize("NFKC").trim().toLowerCase();
}

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(normalizePassword(password)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
}

async function seal(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const out = new Uint8Array(iv.length + body.length);
  out.set(iv, 0);
  out.set(body, iv.length);
  return out;
}

async function askPassword() {
  if (process.env.BONUS_PASSWORD) return process.env.BONUS_PASSWORD;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Password: ");
  rl.close();
  return answer;
}

async function main() {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) {
    console.error("usage: node tools/encrypt.mjs <source folder> <output folder>");
    process.exit(1);
  }
  const password = await askPassword();
  if (normalizePassword(password).length < 8) {
    console.error("The password must be at least 8 characters.");
    process.exit(1);
  }

  let labels = {};
  try {
    labels = JSON.parse(await readFile(path.join(src, "labels.json"), "utf8"));
  } catch { /* labels are optional */ }

  const names = (await readdir(src, { withFileTypes: true }))
    .filter((d) => d.isFile() && !d.name.startsWith(".") && d.name !== "labels.json")
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "ja"));

  await mkdir(out, { recursive: true });
  for (const old of await readdir(out)) {
    if (old.endsWith(".bin")) await rm(path.join(out, old));
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const files = [];
  for (const name of names) {
    const data = await readFile(path.join(src, name));
    const id = Buffer.from(crypto.getRandomValues(new Uint8Array(8))).toString("hex");
    await writeFile(path.join(out, `${id}.bin`), await seal(key, data));
    files.push({ name, size: data.length, file: `${id}.bin`, label: labels[name] || "" });
    console.log(`encrypted ${name} (${data.length} bytes)`);
  }

  const manifest = new TextEncoder().encode(JSON.stringify({ files }));
  await writeFile(path.join(out, "manifest.bin"), await seal(key, manifest));
  await writeFile(path.join(out, "index.json"), JSON.stringify({
    version: 1,
    iterations: ITERATIONS,
    salt: Buffer.from(salt).toString("base64"),
  }, null, 2) + "\n");
  console.log(`done: ${files.length} file(s) -> ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
