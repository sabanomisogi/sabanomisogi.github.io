// Unlock the bonus files in the browser. Shared by every bonus page (yadorimono/, sabakan/, ...):
// files are fetched from the page's own files/ as AES-GCM blobs (see tools/encrypt.mjs)
// and decrypted here; the password never leaves the page.
// While a password is checked or a file is read, the status line shows the can-opener from site.v1.js.
(function () {
  "use strict";

  const BASE = "files/";
  const form = document.getElementById("unlock");
  const input = document.getElementById("password");
  const button = document.getElementById("unlockButton");
  const statusEl = document.getElementById("status");
  const list = document.getElementById("files");
  let key = null;

  // Must match normalizePassword() in tools/encrypt.mjs.
  function normalizePassword(s) {
    return s.normalize("NFKC").trim().toLowerCase();
  }

  const spinEl = document.createElement("span");
  spinEl.className = "status__spin";
  spinEl.setAttribute("aria-hidden", "true");
  spinEl.innerHTML = (window.SabaOpener && window.SabaOpener.markup) || "";
  const textEl = document.createElement("span");
  statusEl.textContent = "";
  statusEl.append(spinEl, textEl);

  // kind: "error", "busy" (shows the opener) or nothing.
  function status(message, kind) {
    textEl.textContent = message;
    statusEl.classList.toggle("error", kind === "error");
    statusEl.classList.toggle("busy", kind === "busy");
  }

  function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
    if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
    return bytes + " B";
  }

  function fromBase64(s) {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  }

  async function fetchBytes(name) {
    const res = await fetch(BASE + name, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return new Uint8Array(await res.arrayBuffer());
  }

  async function open(bytes) {
    const iv = bytes.subarray(0, 12);
    return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, bytes.subarray(12));
  }

  async function deriveKey(password, info) {
    const base = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(normalizePassword(password)), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: fromBase64(info.salt), iterations: info.iterations },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  }

  function save(name, data) {
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function renderList(files) {
    list.textContent = "";
    for (const f of files) {
      const li = document.createElement("li");
      const text = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = f.name;
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = (f.label ? f.label + "・" : "") + formatSize(f.size);
      text.append(name, meta);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.textContent = "保存";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        status(f.name + " を読み込んでいます…（" + formatSize(f.size) + "）", "busy");
        try {
          save(f.name, await open(await fetchBytes(f.file)));
          status(f.name + " を保存しました。");
        } catch (err) {
          status(f.name + " を読み込めませんでした。通信を確かめて、もう一度押してください。（" + err.message + "）", "error");
        } finally {
          btn.disabled = false;
        }
      });
      li.append(text, btn);
      list.appendChild(li);
    }
    list.hidden = files.length === 0;
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!window.crypto || !crypto.subtle) {
      status("このブラウザでは開けません。新しめの Chrome・Edge・Safari・Firefox で開いてください。", "error");
      return;
    }
    if (!normalizePassword(input.value)) {
      status("パスワードを入れてください。", "error");
      return;
    }
    button.disabled = true;
    status("確かめています…", "busy");
    try {
      const res = await fetch(BASE + "index.json", { cache: "no-cache" });
      if (res.status === 404) {
        status("電子特典はまだ準備中です。公開までお待ちください。", "error");
        return;
      }
      if (!res.ok) throw new Error("HTTP " + res.status);
      key = await deriveKey(input.value, await res.json());
      let manifest;
      try {
        manifest = JSON.parse(new TextDecoder().decode(await open(await fetchBytes("manifest.bin"))));
      } catch (err) {
        if (err.name === "OperationError") {
          status("パスワードが違います。打ち間違いがないか確かめてください。", "error");
          return;
        }
        throw err;
      }
      renderList(manifest.files);
      status(manifest.files.length
        ? "開きました。必要なものを「保存」してください。"
        : "電子特典はまだ準備中です。公開までお待ちください。");
    } catch (err) {
      status("読み込めませんでした。通信を確かめて、もう一度試してください。（" + err.message + "）", "error");
    } finally {
      button.disabled = false;
    }
  });
})();
