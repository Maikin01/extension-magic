import { CONFIG } from "./config.js";

const STORAGE_KEYS = {
  KEY: "lovable_license_key",
  DEVICE: "lovable_device_hash",
  LAST_RESULT: "lovable_last_result",
  LAST_CHECK: "lovable_last_check",
};

const ALARM = "lovable_revalidate";

function apiBase() {
  return CONFIG.API_BASE_URL;
}

async function storageGet(keys) {
  return new Promise((res) => chrome.storage.local.get(keys, res));
}
async function storageSet(obj) {
  return new Promise((res) => chrome.storage.local.set(obj, res));
}

async function ensureDeviceHash() {
  const { [STORAGE_KEYS.DEVICE]: existing } = await storageGet(STORAGE_KEYS.DEVICE);
  if (existing) return existing;
  const buf = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  await storageSet({ [STORAGE_KEYS.DEVICE]: hex });
  return hex;
}

async function validate() {
  const { [STORAGE_KEYS.KEY]: key } = await storageGet(STORAGE_KEYS.KEY);
  if (!key) return { skip: true };
  const deviceHash = await ensureDeviceHash();
  try {
    const res = await fetch(`${apiBase()}/api/public/license/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, device_hash: deviceHash }),
    });
    const data = await res.json();
    await storageSet({
      [STORAGE_KEYS.LAST_RESULT]: data,
      [STORAGE_KEYS.LAST_CHECK]: Date.now(),
    });
    return data;
  } catch (err) {
    // Offline: verifica se ainda estamos dentro da tolerância
    const { [STORAGE_KEYS.LAST_CHECK]: last } = await storageGet(STORAGE_KEYS.LAST_CHECK);
    const tol = CONFIG.OFFLINE_TOLERANCE_HOURS * 3600 * 1000;
    if (last && Date.now() - last < tol) return { offline_ok: true };
    return { valid: false, reason: "error", offline_over: true };
  }
}

function scheduleAlarm() {
  chrome.alarms.create(ALARM, {
    delayInMinutes: CONFIG.REVALIDATE_MINUTES,
    periodInMinutes: CONFIG.REVALIDATE_MINUTES,
  });
}
function cancelAlarm() {
  chrome.alarms.clear(ALARM);
}

// Startup + install
chrome.runtime.onStartup?.addListener(async () => {
  await validate();
  scheduleAlarm();
});
chrome.runtime.onInstalled.addListener(async () => {
  await ensureDeviceHash();
  scheduleAlarm();
});

// Alarme periódico
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name === ALARM) await validate();
});

// Mensagens vindas do popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "SCHEDULE_REVALIDATION") {
    scheduleAlarm();
    sendResponse({ ok: true });
    return true;
  }
  if (msg?.type === "CANCEL_REVALIDATION") {
    cancelAlarm();
    sendResponse({ ok: true });
    return true;
  }
  if (msg?.type === "GET_STATUS") {
    (async () => {
      const [key, result] = await Promise.all([
        storageGet(STORAGE_KEYS.KEY),
        storageGet(STORAGE_KEYS.LAST_RESULT),
      ]);
      sendResponse({
        key: key[STORAGE_KEYS.KEY] ?? null,
        result: result[STORAGE_KEYS.LAST_RESULT] ?? null,
      });
    })();
    return true;
  }
});
