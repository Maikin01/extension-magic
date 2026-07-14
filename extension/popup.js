import { CONFIG } from "./config.js";

const STORAGE_KEYS = {
  KEY: "lovable_license_key",
  DEVICE: "lovable_device_hash",
  LAST_RESULT: "lovable_last_result",
  LAST_CHECK: "lovable_last_check",
};

const FEATURE_LABELS = {
  unlimited: "Recursos ilimitados",
  key_daily: "Geração de chaves diárias",
  key_weekly: "Geração de chaves semanais",
  key_monthly: "Geração de chaves mensais",
};

// ---------- Utils ----------
async function storageGet(keys) {
  return new Promise((res) => chrome.storage.local.get(keys, res));
}
async function storageSet(obj) {
  return new Promise((res) => chrome.storage.local.set(obj, res));
}
async function storageRemove(keys) {
  return new Promise((res) => chrome.storage.local.remove(keys, res));
}

function apiBase() {
  // Se este popup foi carregado a partir de um id-preview do Lovable, use dev; caso contrário prod.
  return CONFIG.API_BASE_URL;
}

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
  const { [STORAGE_KEYS.DEVICE]: existing } = await storageGet(STORAGE_KEYS.DEVICE);
  if (existing) return existing;
  const buf = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  await storageSet({ [STORAGE_KEYS.DEVICE]: hex });
  return hex;
}
function extVersion() {
  return chrome.runtime.getManifest().version;
}
function formatDaysLeft(iso) {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expirada";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days <= 0) return `${hours}h`;
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
const REASON_MAP = {
  not_found: {
    title: "Chave não encontrada",
    reason: "Confira se você copiou corretamente do painel.",
  },
  expired: { title: "Licença expirada", reason: "Renove seu plano para continuar." },
  revoked: { title: "Licença revogada", reason: "Fale com o suporte se acha que é um engano." },
  suspended: { title: "Licença suspensa", reason: "Sua conta está temporariamente suspensa." },
  device_limit: {
    title: "Limite de dispositivos atingido",
    reason: "Remova um dispositivo no painel para liberar outro.",
  },
  device_mismatch: {
    title: "Dispositivo não autorizado",
    reason: "Este navegador não está autorizado nessa chave.",
  },
  invalid_payload: {
    title: "Chave em formato inválido",
    reason: "Use o formato LVBL-XXXX-XXXX-XXXX-XXXX.",
  },
  error: { title: "Erro no servidor", reason: "Tente novamente em instantes." },
};

// ---------- API ----------
async function apiActivate(key, deviceHash) {
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
  return res.json().catch(() => ({ valid: false, reason: "error" }));
}

async function apiValidate(key, deviceHash) {
  const res = await fetch(`${apiBase()}/api/public/license/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, device_hash: deviceHash }),
  });
  return res.json().catch(() => ({ valid: false, reason: "error" }));
}

// ---------- UI ----------
function showScreen(name) {
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.toggle("hidden", el.dataset.screen !== name);
  });
}

function renderLicensed(result, key) {
  document.getElementById("licPlan").textContent = result.plan_name ?? "—";
  document.getElementById("licKey").textContent = key;
  document.getElementById("licRemaining").textContent = formatDaysLeft(result.expires_at);
  document.getElementById("licExpiresAt").textContent = formatDate(result.expires_at);
  const list = document.getElementById("featuresList");
  list.innerHTML = "";
  (result.features ?? []).forEach((f) => {
    const div = document.createElement("div");
    div.className = "feature-item";
    div.textContent = FEATURE_LABELS[f] ?? f;
    list.appendChild(div);
  });
  showScreen("licensed");
}

function renderBlocked(reason) {
  const info = REASON_MAP[reason] ?? REASON_MAP.error;
  document.getElementById("blockedTitle").textContent = info.title;
  document.getElementById("blockedReason").textContent = info.reason;
  showScreen("blocked");
}

// ---------- Flow ----------
async function init() {
  const links = document.querySelectorAll("#openSite, #openSiteFromActivate, #openSiteFromBlocked");
  links.forEach((el) => el.setAttribute("href", `${apiBase()}/dashboard`));
  links.forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: `${apiBase()}/dashboard` });
    }),
  );

  document.getElementById("activateBtn").addEventListener("click", handleActivate);
  document.getElementById("logout").addEventListener("click", handleLogout);
  document.getElementById("retryBtn").addEventListener("click", () => showScreen("activate"));

  const deviceHash = await ensureDeviceHash();
  const { [STORAGE_KEYS.KEY]: storedKey } = await storageGet(STORAGE_KEYS.KEY);

  if (!storedKey) {
    showScreen("activate");
    return;
  }

  // Revalida com o servidor
  showScreen("loading");
  const result = await apiValidate(storedKey, deviceHash);
  const now = Date.now();
  await storageSet({
    [STORAGE_KEYS.LAST_RESULT]: result,
    [STORAGE_KEYS.LAST_CHECK]: now,
  });

  if (result.valid) {
    renderLicensed(result, storedKey);
  } else {
    renderBlocked(result.reason ?? "error");
  }
}

async function handleActivate() {
  const btn = document.getElementById("activateBtn");
  const errEl = document.getElementById("activateError");
  const input = document.getElementById("keyInput");
  const key = input.value.trim().toUpperCase();

  errEl.classList.add("hidden");

  if (!/^LVBL(-[A-Z0-9]{4}){4}$/i.test(key)) {
    errEl.textContent = "Formato inválido. Use LVBL-XXXX-XXXX-XXXX-XXXX.";
    errEl.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Ativando…";

  const deviceHash = await ensureDeviceHash();
  const result = await apiActivate(key, deviceHash);

  btn.disabled = false;
  btn.textContent = "Ativar";

  if (result.valid) {
    await storageSet({
      [STORAGE_KEYS.KEY]: key,
      [STORAGE_KEYS.LAST_RESULT]: result,
      [STORAGE_KEYS.LAST_CHECK]: Date.now(),
    });
    // Agendamento de revalidação
    chrome.runtime.sendMessage({ type: "SCHEDULE_REVALIDATION" });
    renderLicensed(result, key);
  } else {
    const info = REASON_MAP[result.reason] ?? REASON_MAP.error;
    errEl.textContent = `${info.title}: ${info.reason}`;
    errEl.classList.remove("hidden");
  }
}

async function handleLogout() {
  if (!confirm("Remover a chave deste dispositivo?")) return;
  await storageRemove([STORAGE_KEYS.KEY, STORAGE_KEYS.LAST_RESULT, STORAGE_KEYS.LAST_CHECK]);
  chrome.runtime.sendMessage({ type: "CANCEL_REVALIDATION" });
  showScreen("activate");
  document.getElementById("keyInput").value = "";
}

document.addEventListener("DOMContentLoaded", init);
