// Unlock the bonus files in the browser. Shared by the bonus pages (yadorimono/, sabakan/, ...):
// files are fetched as AES-GCM blobs (see tools/encrypt.mjs) and decrypted here; the password never leaves the page.
// While a password is checked or a file is read, the status line shows the can-opener from site.v1.js.
//
// v4: a page can show several lists, each from its own folder made by encrypt.mjs with the same password:
//   <div id="groups" hidden>
//     <section class="files-group" data-files="files/"> <h3>…</h3> <ul class="files"></ul> </section>
//     <section class="files-group" data-files="files6/"> … </section>
//   </div>
// A folder that is not there yet (no index.json) is left out. A page with only <ul id="files"> works as in v3.
(function () {
  "use strict";

  const form = document.getElementById("unlock");
  const input = document.getElementById("password");
  const button = document.getElementById("unlockButton");
  const statusEl = document.getElementById("status");
  const wrapEl = document.getElementById("groups");

  const groups = Array.from(document.querySelectorAll("[data-files]")).map((el) => ({
    base: el.getAttribute("data-files"), el, list: el.querySelector(".files"), key: null,
  }));
  if (groups.length === 0) {
    const list = document.getElementById("files");
    groups.push({ base: "files/", el: list, list, key: null });
  }

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

  async function fetchBytes(base, name) {
    const res = await fetch(base + name, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return new Uint8Array(await res.arrayBuffer());
  }

  async function open(key, bytes) {
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

  function renderList(group, files) {
    group.list.textContent = "";
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
          save(f.name, await open(group.key, await fetchBytes(group.base, f.file)));
          status(f.name + " を保存しました。");
        } catch (err) {
          status(f.name + " を読み込めませんでした。通信を確かめて、もう一度押してください。（" + err.message + "）", "error");
        } finally {
          btn.disabled = false;
        }
      });
      li.append(text, btn);
      group.list.appendChild(li);
    }
    group.list.hidden = files.length === 0;
    group.el.hidden = files.length === 0;
  }

  // "none": the folder has no index.json yet; "wrong": the password does not open it; otherwise the file list.
  async function openGroup(group, password) {
    const res = await fetch(group.base + "index.json", { cache: "no-cache" });
    if (res.status === 404) return "none";
    if (!res.ok) throw new Error("HTTP " + res.status);
    group.key = await deriveKey(password, await res.json());
    try {
      return JSON.parse(new TextDecoder().decode(await open(group.key, await fetchBytes(group.base, "manifest.bin")))).files;
    } catch (err) {
      if (err.name === "OperationError") return "wrong";
      throw err;
    }
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
      const results = [];
      for (const g of groups) results.push(await openGroup(g, input.value));
      const opened = results.filter((r) => Array.isArray(r));
      if (opened.length === 0) {
        if (results.includes("wrong")) status("パスワードが違います。打ち間違いがないか確かめてください。", "error");
        else status("電子特典はまだ準備中です。公開までお待ちください。", "error");
        return;
      }
      groups.forEach((g, i) => renderList(g, Array.isArray(results[i]) ? results[i] : []));
      const count = opened.reduce((n, files) => n + files.length, 0);
      if (wrapEl) wrapEl.hidden = count === 0;
      status(count
        ? "開きました。必要なものを「保存」してください。"
        : "電子特典はまだ準備中です。公開までお待ちください。");
    } catch (err) {
      status("読み込めませんでした。通信を確かめて、もう一度試してください。（" + err.message + "）", "error");
    } finally {
      button.disabled = false;
    }
  });
})();
