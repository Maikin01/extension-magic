// License gate — controla acesso ao chat sem tocar em popup.js
// Roda ANTES de popup.js e mantém o chat oculto até validar a chave.

const LICENSE_API_BASE = 'https://vamos-extend-buddy.lovable.app';
const STORAGE_KEYS = {
    key: 'lvbl_license_key',
    deviceHash: 'lvbl_device_hash',
    lastCheck: 'lvbl_last_check',
    licenseInfo: 'lvbl_license_info',
    standardChat: 'lvbl_use_standard_chat',
};
const REVALIDATE_INTERVAL_MS = 30 * 1000; // servidor: confirma periodicamente revogação/suspensão
const WATCHER_INTERVAL_MS = 1000;         // local: corta a chave no segundo em que expirar

// --- utils ----------------------------------------------------------------

function lHex(bytes) {
    const a = new Uint8Array(bytes);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function getOrCreateDeviceHash() {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.deviceHash);
    if (stored[STORAGE_KEYS.deviceHash]) return stored[STORAGE_KEYS.deviceHash];
    const hash = `dev_${lHex(24)}`;
    await chrome.storage.local.set({ [STORAGE_KEYS.deviceHash]: hash });
    return hash;
}

function detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    return 'Unknown';
}

function detectOS() {
    const p = navigator.platform || '';
    if (/Win/i.test(p)) return 'Windows';
    if (/Mac/i.test(p)) return 'macOS';
    if (/Linux/i.test(p)) return 'Linux';
    return 'Unknown';
}

function extVersion() {
    try {
        return chrome.runtime.getManifest().version;
    } catch {
        return '0.0.0';
    }
}

function reasonText(reason) {
    const map = {
        not_found: 'Chave não encontrada.',
        invalid_payload: 'Chave em formato inválido.',
        invalid_key: 'Chave inválida.',
        expired: 'Licença expirada.',
        revoked: 'Licença revogada.',
        suspended: 'Licença suspensa.',
        device_limit: 'Limite de dispositivos atingido para essa chave.',
        device_mismatch: 'Este dispositivo não está autorizado nessa chave.',
        rate_limited: 'Muitas tentativas. Aguarde alguns minutos.',
        network: 'Sem conexão com o servidor. Tente novamente.',
        error: 'Erro no servidor. Tente novamente.',
    };
    return map[reason] || 'Não foi possível validar a licença.';
}

function formatExpires(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        const now = Date.now();
        const diff = d.getTime() - now;
        const days = Math.max(0, Math.floor(diff / 86400000));
        const dateStr = d.toLocaleDateString('pt-BR');
        return `${dateStr} (${days} ${days === 1 ? 'dia' : 'dias'})`;
    } catch {
        return iso;
    }
}

// --- API ------------------------------------------------------------------

async function apiActivate(key, deviceHash) {
    try {
        const res = await fetch(`${LICENSE_API_BASE}/api/public/license/activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key,
                device_hash: deviceHash,
                browser: detectBrowser(),
                os: detectOS(),
                ext_version: extVersion(),
            }),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
    } catch (e) {
        return { ok: false, status: 0, data: { reason: 'network' } };
    }
}

async function apiValidate(key, deviceHash) {
    try {
        const res = await fetch(`${LICENSE_API_BASE}/api/public/license/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, device_hash: deviceHash }),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, data };
    } catch (e) {
        return { ok: false, status: 0, data: { reason: 'network' } };
    }
}

// --- UI -------------------------------------------------------------------

const gate = document.getElementById('licenseGate');
const gateForm = document.getElementById('licenseForm');
const gateInput = document.getElementById('licenseKeyInput');
const gateSubmit = document.getElementById('licenseSubmit');
const gateError = document.getElementById('licenseError');
const gateStatus = document.getElementById('licenseStatus');
const chatShell = document.getElementById('chatShell');
const licenseInfoBar = document.getElementById('licenseInfoBar');
const licenseInfoText = document.getElementById('licenseInfoText');
const licenseLogoutBtn = document.getElementById('licenseLogout');

let watcherIntervalId = null;
let watcherExpiryTimeoutId = null;
let revalidationInFlight = false;

function stopWatcher() {
    if (watcherIntervalId) { clearInterval(watcherIntervalId); watcherIntervalId = null; }
    if (watcherExpiryTimeoutId) { clearTimeout(watcherExpiryTimeoutId); watcherExpiryTimeoutId = null; }
}

function expiryTime(info) {
    const iso = info && (info.expires_at || info.expiresAt);
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : null;
}

function msUntilExpiry(info) {
    const t = expiryTime(info);
    return t == null ? null : t - Date.now();
}

function isLocallyExpired(info) {
    const ms = msUntilExpiry(info);
    return ms != null && ms <= 0;
}

function setChatControlsDisabled(disabled) {
    try {
        document.querySelectorAll('#chatShell textarea, #chatShell input, #chatShell button').forEach((el) => {
            if (disabled) el.setAttribute('disabled', 'true');
            else el.removeAttribute('disabled');
        });
    } catch (_) {}
}

async function disconnectExpiredLicense(reason) {
    stopWatcher();
    setChatControlsDisabled(true);
    await chrome.storage.local.remove([
        STORAGE_KEYS.key,
        STORAGE_KEYS.licenseInfo,
        STORAGE_KEYS.lastCheck,
        STORAGE_KEYS.standardChat,
    ]);
    if (gateInput) gateInput.value = '';
    showGate();
    setError(reasonText(reason || 'expired'));
}

async function forceRevalidate(reason) {
    if (revalidationInFlight) return;
    revalidationInFlight = true;
    const stored = await chrome.storage.local.get([STORAGE_KEYS.key, STORAGE_KEYS.licenseInfo]);
    const savedKey = stored[STORAGE_KEYS.key];
    try {
        if (!savedKey) return kickToGate(reason);
        if (isLocallyExpired(stored[STORAGE_KEYS.licenseInfo])) {
            return disconnectExpiredLicense('expired');
        }

        const deviceHash = await getOrCreateDeviceHash();
        const res = await apiValidate(savedKey, deviceHash);
        if (res.ok && res.data.valid && !isLocallyExpired(res.data)) {
            await chrome.storage.local.set({
                [STORAGE_KEYS.lastCheck]: Date.now(),
                [STORAGE_KEYS.licenseInfo]: res.data,
            });
            scheduleWatcher(res.data);
        } else if (res.data.reason === 'network') {
            // offline: mantém só enquanto a data local ainda não venceu
            if (isLocallyExpired(stored[STORAGE_KEYS.licenseInfo])) {
                await disconnectExpiredLicense('expired');
            }
        } else {
            kickToGate(res.data.reason || reason);
        }
    } finally {
        revalidationInFlight = false;
    }
}

async function kickToGate(reason) {
    stopWatcher();
    setChatControlsDisabled(true);
    await chrome.storage.local.remove([
        STORAGE_KEYS.key,
        STORAGE_KEYS.licenseInfo,
        STORAGE_KEYS.lastCheck,
        STORAGE_KEYS.standardChat,
    ]);
    showGate();
    setError(reasonText(reason || 'expired'));
}

function scheduleWatcher(info) {
    stopWatcher();
    const tick = async () => {
        const stored = await chrome.storage.local.get([
            STORAGE_KEYS.key,
            STORAGE_KEYS.lastCheck,
            STORAGE_KEYS.licenseInfo,
        ]);
        if (!stored[STORAGE_KEYS.key]) return showGate();
        const currentInfo = stored[STORAGE_KEYS.licenseInfo] || info;
        if (isLocallyExpired(currentInfo)) {
            await disconnectExpiredLicense('expired');
            return;
        }
        const lastCheck = stored[STORAGE_KEYS.lastCheck] || 0;
        if (Date.now() - lastCheck > REVALIDATE_INTERVAL_MS) {
            await forceRevalidate('expired');
        }
    };

    watcherIntervalId = setInterval(() => { tick(); }, WATCHER_INTERVAL_MS);

    const ms = msUntilExpiry(info);
    if (ms != null) {
        if (ms <= 0) {
            disconnectExpiredLicense('expired');
        } else if (ms < 2147483647) {
            watcherExpiryTimeoutId = setTimeout(() => { disconnectExpiredLicense('expired'); }, ms + 50);
        }
    }
}

function showGate() {
    stopWatcher();
    setChatControlsDisabled(true);
    gate.style.display = 'flex';
    chatShell.style.display = 'none';
    licenseInfoBar.style.display = 'none';
    setTimeout(() => gateInput?.focus(), 50);
}

function showChat(info) {
    if (isLocallyExpired(info)) {
        disconnectExpiredLicense('expired');
        return;
    }
    setChatControlsDisabled(false);
    gate.style.display = 'none';
    chatShell.style.display = 'flex';
    if (licenseInfoBar) licenseInfoBar.style.display = 'none';
    scheduleWatcher(info);
}


function setBusy(busy, label) {
    gateSubmit.disabled = busy;
    gateInput.disabled = busy;
    gateStatus.textContent = busy ? (label || 'Validando...') : '';
}

function setError(msg) {
    gateError.textContent = msg || '';
    gateError.style.display = msg ? 'block' : 'none';
}

// --- flow -----------------------------------------------------------------

async function tryAutoValidate() {
    const stored = await chrome.storage.local.get([
        STORAGE_KEYS.key,
        STORAGE_KEYS.lastCheck,
        STORAGE_KEYS.licenseInfo,
    ]);
    const savedKey = stored[STORAGE_KEYS.key];
    if (!savedKey) {
        showGate();
        return;
    }

    if (isLocallyExpired(stored[STORAGE_KEYS.licenseInfo])) {
        await disconnectExpiredLicense('expired');
        return;
    }

    // Mostra chat de cara com info do cache (se houver) e revalida em background
    if (stored[STORAGE_KEYS.licenseInfo]) {
        showChat(stored[STORAGE_KEYS.licenseInfo]);
    } else {
        gate.style.display = 'flex';
        chatShell.style.display = 'none';
        gateStatus.textContent = 'Validando licença...';
    }

    const lastCheck = stored[STORAGE_KEYS.lastCheck] || 0;
    const needsCheck = Date.now() - lastCheck > REVALIDATE_INTERVAL_MS || !stored[STORAGE_KEYS.licenseInfo];

    if (!needsCheck) return;

    const deviceHash = await getOrCreateDeviceHash();
    const res = await apiValidate(savedKey, deviceHash);

    if (res.ok && res.data.valid && !isLocallyExpired(res.data)) {
        await chrome.storage.local.set({
            [STORAGE_KEYS.lastCheck]: Date.now(),
            [STORAGE_KEYS.licenseInfo]: res.data,
        });
        showChat(res.data);
    } else if (res.data.reason === 'network') {
        // Offline: se tinha info em cache e ainda não venceu, mantém liberado
        if (stored[STORAGE_KEYS.licenseInfo] && !isLocallyExpired(stored[STORAGE_KEYS.licenseInfo])) {
            showChat(stored[STORAGE_KEYS.licenseInfo]);
        } else {
            showGate();
            setError(reasonText('network'));
        }
    } else {
        await chrome.storage.local.remove([STORAGE_KEYS.key, STORAGE_KEYS.licenseInfo, STORAGE_KEYS.lastCheck]);
        showGate();
        setError(reasonText(res.data.reason));
    }
}

async function handleActivate(e) {
    e.preventDefault();
    const key = gateInput.value.trim();
    if (!key) {
        setError('Digite sua chave de licença.');
        return;
    }
    setError('');
    setBusy(true, 'Ativando...');

    const deviceHash = await getOrCreateDeviceHash();
    const res = await apiActivate(key, deviceHash);

    setBusy(false);

    if (res.ok && res.data.valid && !isLocallyExpired(res.data)) {
        await chrome.storage.local.set({
            [STORAGE_KEYS.key]: key,
            [STORAGE_KEYS.lastCheck]: Date.now(),
            [STORAGE_KEYS.licenseInfo]: res.data,
        });
        showChat(res.data);
    } else {
        setError(reasonText(res.data.reason || 'expired'));
    }
}

async function handleLogout() {
    await chrome.storage.local.remove([
        STORAGE_KEYS.key,
        STORAGE_KEYS.lastCheck,
        STORAGE_KEYS.licenseInfo,
        STORAGE_KEYS.standardChat,
    ]);
    gateInput.value = '';
    setError('');
    showGate();
}

// bootstrap
gateForm.addEventListener('submit', handleActivate);
if (licenseLogoutBtn) licenseLogoutBtn.addEventListener('click', handleLogout);
const licenseLogoutTopBtn = document.getElementById('licenseLogoutTop');
if (licenseLogoutTopBtn) licenseLogoutTopBtn.addEventListener('click', handleLogout);

window.LVBL_LICENSE_FORCE_EXPIRE = () => disconnectExpiredLicense('expired');
window.LVBL_LICENSE_CHECK_NOW = () => forceRevalidate('expired');

if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        const infoChange = changes[STORAGE_KEYS.licenseInfo];
        if (infoChange && infoChange.newValue && isLocallyExpired(infoChange.newValue)) {
            disconnectExpiredLicense('expired');
        }
        const keyChange = changes[STORAGE_KEYS.key];
        if (keyChange && !keyChange.newValue && chatShell && chatShell.style.display !== 'none') {
            showGate();
        }
    });
}

// Auto-uppercase e format helper leve
gateInput.addEventListener('input', () => {
    const p = gateInput.selectionStart;
    gateInput.value = gateInput.value.toUpperCase();
    gateInput.setSelectionRange(p, p);
});

tryAutoValidate();
