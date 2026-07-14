import { CONFIG } from "./config.js";
import { I18N, t, setLang, getLang, loadLang, applyI18n } from "./i18n.js";

const STORAGE_KEYS = {
  KEY: "lovable_license_key",
  DEVICE: "lovable_device_hash",
  LAST_RESULT: "lovable_last_result",
  LAST_CHECK: "lovable_last_check",
  THEME: "lv_theme",
  HISTORY: "lv_history",
};

const MAX_HISTORY = 200;

// ────────────────── Utils ──────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function sget(keys) { return new Promise((r) => chrome.storage.local.get(keys, r)); }
async function sset(obj) { return new Promise((r) => chrome.storage.local.set(obj, r)); }
async function srem(keys) { return new Promise((r) => chrome.storage.local.remove(keys, r)); }

function apiBase() { return CONFIG.API_BASE_URL; }
function extVersion() { return chrome.runtime.getManifest().version; }

function detectBrowser() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "Outro";
}
function detectOS() {
  const ua = navigator.userAgent;
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  return "Outro";
}

async function ensureDeviceHash() {
  const { [STORAGE_KEYS.DEVICE]: existing } = await sget(STORAGE_KEYS.DEVICE);
  if (existing) return existing;
  const buf = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  await sset({ [STORAGE_KEYS.DEVICE]: hex });
  return hex;
}

function formatCountdown(iso) {
  if (!iso) return { text: "—", pct: 0, urgent: false };
  const total = new Date(iso).getTime() - Date.now();
  if (total <= 0) return { text: "Expirada", pct: 100, urgent: true };
  const days = Math.floor(total / 86400000);
  const hours = Math.floor((total % 86400000) / 3600000);
  const mins = Math.floor((total % 3600000) / 60000);
  const secs = Math.floor((total % 60000) / 1000);
  let text;
  if (days > 0) text = `${days}d ${hours}h`;
  else if (hours > 0) text = `${hours}h ${mins}m`;
  else text = `${mins}:${String(secs).padStart(2, "0")}`;
  const totalWindow = 7 * 86400000;
  const pct = Math.max(2, Math.min(100, (total / totalWindow) * 100));
  const urgent = total < 3600000;
  return { text, pct, urgent };
}

// ────────────────── API ──────────────────
async function apiActivate(key, deviceHash) {
  try {
    const res = await fetch(`${apiBase()}/api/public/license/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        device_hash: deviceHash,
        browser: detectBrowser(),
        os: detectOS(),
        ext_version: extVersion(),
      }),
    });
    return await res.json();
  } catch (e) {
    return { valid: false, reason: "error" };
  }
}

async function apiValidate(key, deviceHash) {
  try {
    const res = await fetch(`${apiBase()}/api/public/license/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, device_hash: deviceHash }),
    });
    return await res.json();
  } catch (e) {
    return { valid: false, reason: "error" };
  }
}

// ────────────────── UI helpers ──────────────────
function showScreen(name) {
  $$(".lv-screen").forEach((el) => {
    el.classList.toggle("hidden", el.dataset.screen !== name);
  });
}

function toast(msg, kind = "info") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "lv-toast lv-toast-show" + (kind === "error" ? " lv-toast-error" : kind === "success" ? " lv-toast-success" : "");
  setTimeout(() => { el.className = "lv-toast"; }, 2500);
}

function setLog(id, msg, kind = "info") {
  const el = $(`#${id}`);
  if (!el) return;
  el.textContent = msg || "";
  el.className = "lv-log" + (msg ? " lv-log-" + kind : "");
}

// ────────────────── Shortcuts ──────────────────
const SHORTCUT_ICONS = {
  bugs: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  refactor: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  errors: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  optimize: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  comments: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  seo: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  ui: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="0.5"/><circle cx="17.5" cy="10.5" r="0.5"/><circle cx="8.5" cy="7.5" r="0.5"/><circle cx="6.5" cy="12" r="0.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  components: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  review: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
};

const SHORTCUTS = [
  "bugs", "refactor", "errors",
  "optimize", "comments", "seo",
  "ui", "components", "review",
];

function renderShortcuts() {
  const grid = $("#shortcuts");
  grid.innerHTML = SHORTCUTS.map((k) => `
    <button class="lv-shortcut-btn" data-prompt="${k}">
      ${SHORTCUT_ICONS[k]}
      <span>${t("sc." + k)}</span>
    </button>
  `).join("");
  grid.querySelectorAll(".lv-shortcut-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.prompt;
      $("#promptText").value = t("sc." + k + ".prompt");
      $("#promptText").focus();
    });
  });
}

// ────────────────── History ──────────────────
async function getHistory() {
  const { [STORAGE_KEYS.HISTORY]: h } = await sget(STORAGE_KEYS.HISTORY);
  return h || [];
}

async function pushHistory(text) {
  const h = await getHistory();
  h.unshift({ text, ts: Date.now(), status: "sent" });
  const trimmed = h.slice(0, MAX_HISTORY);
  await sset({ [STORAGE_KEYS.HISTORY]: trimmed });
  updateHistoryBadge(trimmed.length);
}

function updateHistoryBadge(n) {
  const b = $("#historyBadge");
  if (n > 0) { b.textContent = n; b.style.display = ""; }
  else b.style.display = "none";
}

function renderHistoryBubble(m) {
  const time = new Date(m.ts).toLocaleTimeString(
    { pt: "pt-BR", en: "en-US", es: "es-ES" }[getLang()] || "pt-BR",
    { hour: "2-digit", minute: "2-digit" },
  );
  const trunc = m.text.length > 220 ? m.text.slice(0, 220) + "…" : m.text;
  return `
    <div class="lv-chat-bubble" title="${m.text.replace(/"/g, "&quot;")}">
      ${escapeHtml(trunc)}
      <div class="lv-chat-meta">
        <span class="lv-chat-status-ok">${t("chat.sent")}</span>
        <span class="lv-chat-time">${time}</span>
        <span>✓✓</span>
      </div>
    </div>
  `;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}

async function renderHistory() {
  const list = $("#historyList");
  const h = await getHistory();
  if (!h.length) {
    list.innerHTML = `
      <div class="lv-empty">
        <div class="lv-empty-icon">💬</div>
        <div class="lv-empty-title">${t("history.empty.title")}</div>
        <div class="lv-empty-desc">${t("history.empty.desc")}</div>
      </div>`;
    return;
  }
  list.innerHTML = h.map(renderHistoryBubble).join("") + `
    <div class="lv-chat-actions">
      <span class="lv-chat-count">${t("history.count", h.length)}</span>
      <button class="lv-chat-clear" id="clearHistoryBtn">${t("history.clear")}</button>
    </div>
  `;
  $("#clearHistoryBtn")?.addEventListener("click", async () => {
    await srem(STORAGE_KEYS.HISTORY);
    updateHistoryBadge(0);
    renderHistory();
  });
}

// ────────────────── Countdown ──────────────────
let countdownInterval = null;

function startCountdown(expiresAt) {
  if (countdownInterval) clearInterval(countdownInterval);
  const el = $("#countdown");
  if (!expiresAt) { el.innerHTML = ""; return; }
  const tick = () => {
    const { text, pct, urgent } = formatCountdown(expiresAt);
    el.innerHTML = `
      <div class="lv-countdown-row">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span class="lv-countdown-label">${t("countdown.expires")}</span>
        <span class="lv-countdown-time">${text}</span>
      </div>
      <div class="lv-trial-bar">
        <div class="lv-trial-bar-fill${urgent ? " lv-bar-urgent" : ""}" style="width:${pct}%"></div>
      </div>
    `;
  };
  tick();
  countdownInterval = setInterval(tick, 1000);
}

// ────────────────── Send action ──────────────────
async function sendPrompt() {
  const txt = $("#promptText").value.trim();
  if (!txt) { toast(t("toast.empty"), "error"); return; }

  // Try to inject into an active Lovable tab; fallback to clipboard.
  let sentToLovable = false;
  try {
    const tabs = await new Promise((r) => chrome.tabs.query({ active: true, currentWindow: true }, r));
    const tab = tabs && tabs[0];
    if (tab && tab.url && /lovable\.(dev|app)/.test(tab.url)) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: injectPromptIntoLovable,
          args: [txt],
        });
        sentToLovable = true;
      } catch (e) {
        // scripting may fail if permission missing; fallback to clipboard.
      }
    }
  } catch (e) {}

  if (!sentToLovable) {
    try { await navigator.clipboard.writeText(txt); } catch (e) {}
    toast(t("toast.copied"), "success");
  } else {
    toast(t("toast.sent"), "success");
  }

  await pushHistory(txt);
  $("#promptText").value = "";
}

// Injected into the Lovable tab.
function injectPromptIntoLovable(text) {
  const findComposer = () =>
    document.querySelector('textarea[placeholder*="Lovable" i], textarea[placeholder*="Ask" i], textarea, [contenteditable="true"]');
  const el = findComposer();
  if (!el) return false;
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    el.textContent = text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text }));
  }
  el.focus();
  return true;
}

// ────────────────── Voice ──────────────────
let recognition = null;
function toggleMic() {
  const btn = $("#micBtn");
  if (recognition) {
    recognition.stop();
    recognition = null;
    btn.classList.remove("lv-tool-active");
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast("Voice not supported", "error"); return; }
  recognition = new SR();
  recognition.lang = { pt: "pt-BR", en: "en-US", es: "es-ES" }[getLang()] || "pt-BR";
  recognition.interimResults = true;
  recognition.continuous = true;
  const base = $("#promptText").value;
  recognition.onresult = (e) => {
    let final = "", interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    $("#promptText").value = (base + " " + final + interim).trim();
  };
  recognition.onend = () => { btn.classList.remove("lv-tool-active"); recognition = null; };
  recognition.start();
  btn.classList.add("lv-tool-active");
}

// ────────────────── License flow ──────────────────
const REASON_MAP = {
  not_found: "err.not_found",
  expired: "err.expired",
  revoked: "err.revoked",
  suspended: "err.suspended",
  device_limit: "err.device_limit",
  device_mismatch: "err.device_mismatch",
  invalid_payload: "err.invalid_payload",
  error: "err.error",
};

async function renderMain(result, key) {
  $("#planBadge").style.display = "";
  $("#planBadge").textContent = (result.plan_name || "PRO").toUpperCase();
  $("#logoutBtn").style.display = "";
  $("#userName").textContent = "User";
  $("#planName").textContent = result.plan_name ? `${result.plan_name}` : "";
  startCountdown(result.expires_at);
  const h = await getHistory();
  updateHistoryBadge(h.length);
  renderShortcuts();
  renderHistory();
  showScreen("main");
}

function renderBlocked(reason) {
  const key = REASON_MAP[reason] || "err.error";
  $("#blockedReason").textContent = t(key);
  showScreen("blocked");
}

async function doValidate(storedKey, deviceHash) {
  showScreen("loading");
  const result = await apiValidate(storedKey, deviceHash);
  await sset({
    [STORAGE_KEYS.LAST_RESULT]: result,
    [STORAGE_KEYS.LAST_CHECK]: Date.now(),
  });
  if (result.valid) renderMain(result, storedKey);
  else renderBlocked(result.reason || "error");
}

async function handleActivate() {
  const btn = $("#activateBtn");
  const input = $("#keyInput");
  const key = input.value.trim().toUpperCase();
  setLog("gateLog", "");
  if (!key) { setLog("gateLog", t("err.empty_key"), "error"); return; }
  btn.disabled = true;
  btn.textContent = "…";
  const deviceHash = await ensureDeviceHash();
  const result = await apiActivate(key, deviceHash);
  btn.disabled = false;
  btn.textContent = t("license.validate");
  if (result.valid) {
    await sset({
      [STORAGE_KEYS.KEY]: key,
      [STORAGE_KEYS.LAST_RESULT]: result,
      [STORAGE_KEYS.LAST_CHECK]: Date.now(),
    });
    try { chrome.runtime.sendMessage({ type: "SCHEDULE_REVALIDATION" }); } catch (e) {}
    setLog("gateLog", "✅", "success");
    renderMain(result, key);
  } else {
    const rk = REASON_MAP[result.reason] || "err.error";
    setLog("gateLog", t(rk), "error");
  }
}

async function handleLogout() {
  if (countdownInterval) clearInterval(countdownInterval);
  try { chrome.runtime.sendMessage({ type: "CANCEL_REVALIDATION" }); } catch (e) {}
  await srem([STORAGE_KEYS.KEY, STORAGE_KEYS.LAST_RESULT, STORAGE_KEYS.LAST_CHECK]);
  $("#planBadge").style.display = "none";
  $("#logoutBtn").style.display = "none";
  $("#keyInput").value = "";
  setLog("gateLog", "");
  showScreen("gate");
}

// ────────────────── Theme ──────────────────
async function initTheme() {
  const { [STORAGE_KEYS.THEME]: th } = await sget(STORAGE_KEYS.THEME);
  if (th === "light") document.body.classList.add("lv-light");
}

async function toggleTheme() {
  const isLight = document.body.classList.toggle("lv-light");
  await sset({ [STORAGE_KEYS.THEME]: isLight ? "light" : "dark" });
}

// ────────────────── Init ──────────────────
async function init() {
  loadLang();
  // sync active button
  $$(".lv-lang-btn").forEach((b) => {
    b.classList.toggle("lv-lang-active", b.dataset.lang === getLang());
  });
  applyI18n(document);
  $("#extVersion").textContent = "v" + extVersion();
  await initTheme();

  // Header actions
  $("#themeBtn").addEventListener("click", toggleTheme);
  $("#logoutBtn").addEventListener("click", handleLogout);
  $$(".lv-lang-btn").forEach((b) => {
    b.addEventListener("click", () => {
      setLang(b.dataset.lang);
      $$(".lv-lang-btn").forEach((x) => x.classList.toggle("lv-lang-active", x === b));
      applyI18n(document);
      renderShortcuts();
      renderHistory();
    });
  });

  // Gate actions
  $("#activateBtn").addEventListener("click", handleActivate);
  $("#keyInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleActivate();
  });
  const dashUrl = `${apiBase()}/dashboard`;
  const supportUrl = apiBase();
  [$("#buyLink"), $("#buyLinkBlocked")].forEach((a) => {
    if (!a) return;
    a.href = dashUrl;
    a.addEventListener("click", (e) => { e.preventDefault(); chrome.tabs.create({ url: dashUrl }); });
  });
  $("#supportLink").href = supportUrl;
  $("#supportLink").addEventListener("click", (e) => { e.preventDefault(); chrome.tabs.create({ url: supportUrl }); });

  // Retry
  $("#retryBtn").addEventListener("click", () => {
    $("#keyInput").value = "";
    setLog("gateLog", "");
    showScreen("gate");
  });

  // Main screen actions
  $("#sendBtn").addEventListener("click", sendPrompt);
  $("#promptText").addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") sendPrompt();
  });
  $("#micBtn").addEventListener("click", toggleMic);
  $("#attachBtn").addEventListener("click", () => toast("Em breve", "info"));
  $("#optimizeBtn").addEventListener("click", () => toast("Em breve", "info"));

  // Tabs
  $$(".lv-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".lv-tab").forEach((x) => x.classList.toggle("lv-tab-active", x === tab));
      const id = tab.dataset.tab;
      $("#tabPrompt").classList.toggle("hidden", id !== "prompt");
      $("#tabHistory").classList.toggle("hidden", id !== "history");
      if (id === "history") renderHistory();
    });
  });

  // Boot
  const deviceHash = await ensureDeviceHash();
  const { [STORAGE_KEYS.KEY]: storedKey } = await sget(STORAGE_KEYS.KEY);
  if (!storedKey) { showScreen("gate"); return; }
  await doValidate(storedKey, deviceHash);
}

init();
