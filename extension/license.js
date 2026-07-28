// License gate — controla acesso ao chat sem tocar em popup.js
// Roda ANTES de popup.js e mantém o chat oculto até validar a chave.

const LICENSE_API_BASE = 'https://paokcsxuxipnbnbgnlzs.supabase.co/functions/v1/public-api';
const STORAGE_KEYS = {
    key: 'lvbl_license_key',
    deviceHash: 'lvbl_device_hash',
    lastCheck: 'lvbl_last_check',
    licenseInfo: 'lvbl_license_info',
};
const REVALIDATE_INTERVAL_MS = 15000; // 15s — revalida no servidor; o tick local (1s) cuida da expiração

let activeLicense = null;
let licenseWatchTimer = null;
let validationInFlight = false;
let lastValidationAt = 0;

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

function parseTime(value) {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
}

function getRemainingMs(info, checkedAt) {
    if (!info) return 0;
    const expiresAtMs = parseTime(info.expires_at);
    if (expiresAtMs == null) return Infinity;

    const serverNowAtCheck = parseTime(info.server_now);
    const localCheckedAt = typeof checkedAt === 'number' ? checkedAt : Date.now();
    const elapsedSinceCheck = Math.max(0, Date.now() - localCheckedAt);

    if (serverNowAtCheck != null) {
        return expiresAtMs - (serverNowAtCheck + elapsedSinceCheck);
    }

    if (typeof info.expires_in_ms === 'number') {
        return info.expires_in_ms - elapsedSinceCheck;
    }

    return expiresAtMs - Date.now();
}

function formatRemaining(ms) {
    if (!Number.isFinite(ms)) return 'Sem expiração';
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const two = (n) => String(n).padStart(2, '0');

    if (days > 0) return `${days}d ${two(hours)}:${two(minutes)}:${two(seconds)}`;
    if (hours > 0) return `${two(hours)}:${two(minutes)}:${two(seconds)}`;
    return `${two(minutes)}:${two(seconds)}`;
}

function updateCountdown(info, checkedAt) {
    const remainingMs = getRemainingMs(info, checkedAt);
    const timerValue = document.querySelector('.timer-value');
    const timerFill = document.querySelector('.timer-bar-fill');
    if (timerValue) timerValue.textContent = formatRemaining(remainingMs);

    if (timerFill) {
        const expiresAtMs = parseTime(info?.expires_at);
        const activatedAtMs = parseTime(info?.activated_at);
        let totalMs = null;
        if (expiresAtMs != null && activatedAtMs != null && expiresAtMs > activatedAtMs) {
            totalMs = expiresAtMs - activatedAtMs;
        } else if (typeof info?.expires_in_ms === 'number') {
            totalMs = info.expires_in_ms + Math.max(0, Date.now() - (checkedAt || Date.now()));
        }

        if (totalMs && Number.isFinite(totalMs) && totalMs > 0) {
            const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
            timerFill.style.width = `${pct}%`;
        } else {
            timerFill.style.width = '100%';
        }
    }

    return remainingMs;
}

// --- API ------------------------------------------------------------------

async function apiActivate(key, deviceHash) {
    try {
        const res = await fetch(`${LICENSE_API_BASE}/license/activate`, {
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

async function apiValidate(key, deviceHash, silent = false) {
    try {
        const res = await fetch(`${LICENSE_API_BASE}/license/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, device_hash: deviceHash, silent }),
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

function showGate() {
    stopLicenseWatch();
    gate.style.display = 'flex';
    chatShell.style.display = 'none';
    licenseInfoBar.style.display = 'none';
    setTimeout(() => gateInput?.focus(), 50);
}

function showChat(info, checkedAt = Date.now()) {
    gate.style.display = 'none';
    chatShell.style.display = 'flex';
    if (licenseInfoBar) licenseInfoBar.style.display = 'none';
    updateCountdown(info, checkedAt);
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

function stopLicenseWatch() {
    if (licenseWatchTimer) clearInterval(licenseWatchTimer);
    licenseWatchTimer = null;
    activeLicense = null;
    validationInFlight = false;
}

async function expireAndLock(reason = 'expired') {
    stopLicenseWatch();
    await chrome.storage.local.remove([
        STORAGE_KEYS.key,
        STORAGE_KEYS.lastCheck,
        STORAGE_KEYS.licenseInfo,
    ]);
    gateInput.value = '';
    setBusy(false);
    showGate();
    setError(reason === 'expired' ? 'Licença expirada. Insira uma nova chave.' : reasonText(reason));
}

async function storeValidLicense(key, info) {
    const checkedAt = Date.now();
    await chrome.storage.local.set({
        [STORAGE_KEYS.key]: key,
        [STORAGE_KEYS.lastCheck]: checkedAt,
        [STORAGE_KEYS.licenseInfo]: info,
    });
    try { await window.__lvblBranding?.setBrandingCode(info?.branding_code || null); } catch {}
    showChat(info, checkedAt);
    startLicenseWatch(key, info, checkedAt);
}

function startLicenseWatch(key, info, checkedAt = Date.now()) {
    if (licenseWatchTimer) clearInterval(licenseWatchTimer);
    activeLicense = { key, info, checkedAt };
    lastValidationAt = 0;

    const tick = async () => {
        if (!activeLicense) return;
        const remainingMs = updateCountdown(activeLicense.info, activeLicense.checkedAt);

        if (remainingMs <= 0) {
            await validateActiveLicense(true);
            if (!activeLicense || getRemainingMs(activeLicense.info, activeLicense.checkedAt) <= 0) {
                await expireAndLock('expired');
            }
            return;
        }

        if (Date.now() - lastValidationAt >= REVALIDATE_INTERVAL_MS) {
            await validateActiveLicense(false);
        }
    };

    tick();
    licenseWatchTimer = setInterval(tick, 1000);
}

async function validateActiveLicense(forceLockOnNetworkError) {
    if (!activeLicense || validationInFlight) return;
    validationInFlight = true;
    try {
        const deviceHash = await getOrCreateDeviceHash();
        const res = await apiValidate(activeLicense.key, deviceHash, true);
        lastValidationAt = Date.now();

        if (res.ok && res.data.valid) {
            const prevExpires = activeLicense.info?.expires_at;
            const newExpires = res.data?.expires_at;
            // Só reancorar o relógio local se o expires_at mudou; caso contrário
            // manter o checkedAt original evita o "pisca" causado pela latência
            // variável da rede a cada revalidação.
            if (prevExpires !== newExpires) {
                activeLicense.info = res.data;
                activeLicense.checkedAt = Date.now();
                await chrome.storage.local.set({
                    [STORAGE_KEYS.lastCheck]: activeLicense.checkedAt,
                    [STORAGE_KEYS.licenseInfo]: res.data,
                });
            }
            try { await window.__lvblBranding?.setBrandingCode(res.data?.branding_code || null); } catch {}
            setError('');
            return;
        }

        if (res.data.reason === 'network') {
            if (forceLockOnNetworkError || getRemainingMs(activeLicense.info, activeLicense.checkedAt) <= 0) {
                await expireAndLock('expired');
            } else {
                gateStatus.textContent = 'Revalidando licença...';
            }
            return;
        }

        await expireAndLock(res.data.reason || 'invalid_key');
    } finally {
        validationInFlight = false;
    }
}

// --- send authorization (obrigatório antes de cada envio de mensagem) -----
// Exposta como window.__lvblAuthorizeSend. popup.js chama isto antes de cada
// fetch para api.lovable.dev/chat. Sem OK do servidor, o envio é bloqueado.
const AUTHORIZE_CACHE_MS = 25000;
let lastAuthorizeAt = 0;
let lastAuthorizeOk = false;
let authorizeInFlight = null;

async function authorizeSend() {
    try {
        // Sem licença ativa em memória? tenta recuperar do storage.
        if (!activeLicense) {
            const stored = await chrome.storage.local.get([
                STORAGE_KEYS.key,
                STORAGE_KEYS.lastCheck,
                STORAGE_KEYS.licenseInfo,
            ]);
            const savedKey = stored[STORAGE_KEYS.key];
            const cachedInfo = stored[STORAGE_KEYS.licenseInfo];
            if (!savedKey || !cachedInfo) return false;
            activeLicense = {
                key: savedKey,
                info: cachedInfo,
                checkedAt: stored[STORAGE_KEYS.lastCheck] || Date.now(),
            };
        }

        // Expirou localmente
        if (getRemainingMs(activeLicense.info, activeLicense.checkedAt) <= 0) {
            await expireAndLock('expired');
            return false;
        }

        // Cache curto para não penalizar envios rápidos em sequência
        if (lastAuthorizeOk && Date.now() - lastAuthorizeAt < AUTHORIZE_CACHE_MS) {
            return true;
        }

        // Coalesce chamadas concorrentes
        if (authorizeInFlight) return authorizeInFlight;

        authorizeInFlight = (async () => {
            const deviceHash = await getOrCreateDeviceHash();
            const res = await apiValidate(activeLicense.key, deviceHash, true);
            if (res.ok && res.data && res.data.valid) {
                lastAuthorizeOk = true;
                lastAuthorizeAt = Date.now();
                // Atualiza expires_at se mudou
                const newExpires = res.data.expires_at;
                if (activeLicense.info?.expires_at !== newExpires) {
                    activeLicense.info = res.data;
                    activeLicense.checkedAt = Date.now();
                    await chrome.storage.local.set({
                        [STORAGE_KEYS.lastCheck]: activeLicense.checkedAt,
                        [STORAGE_KEYS.licenseInfo]: res.data,
                    });
                }
                return true;
            }
            lastAuthorizeOk = false;
            // Rede caiu: se ainda tem tempo local, permite; senão bloqueia
            if (res.data?.reason === 'network') {
                return getRemainingMs(activeLicense.info, activeLicense.checkedAt) > 0;
            }
            await expireAndLock(res.data?.reason || 'invalid_key');
            return false;
        })();

        try {
            return await authorizeInFlight;
        } finally {
            authorizeInFlight = null;
        }
    } catch (e) {
        return false;
    }
}

window.__lvblAuthorizeSend = authorizeSend;

// Transporte blindado — popup.js só envia mensagens através desta função.
// Se license.js for removido do ZIP, __lvblFetch some e o envio quebra.
window.__lvblFetch = async function lvblFetch(url, opts) {
    const ok = await authorizeSend();
    if (!ok) throw new Error('license_required');
    return fetch(url, opts);
};

// Vigia anti-tamper: se popup.js for adulterado para pular o guard,
// re-injetamos a checagem a cada clique do botão de envio.
try {
    const rearmGuard = () => {
        const btn = document.getElementById('sendButton') || document.querySelector('[data-send], .send-btn');
        if (!btn || btn.__lvblGuarded) return;
        btn.__lvblGuarded = true;
        btn.addEventListener('click', async (ev) => {
            if (typeof window.__lvblFetch !== 'function') {
                ev.stopImmediatePropagation();
                ev.preventDefault();
            }
        }, true);
    };
    document.addEventListener('DOMContentLoaded', rearmGuard);
    setInterval(rearmGuard, 2000);
} catch (_) {}

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

    const cachedInfo = stored[STORAGE_KEYS.licenseInfo];
    const lastCheck = stored[STORAGE_KEYS.lastCheck] || Date.now();
    if (cachedInfo && getRemainingMs(cachedInfo, lastCheck) <= 0) {
        await expireAndLock('expired');
        return;
    }

    gate.style.display = 'flex';
    chatShell.style.display = 'none';
    gateInput.value = savedKey;
    setError('');
    gateStatus.textContent = 'Validando licença...';

    const deviceHash = await getOrCreateDeviceHash();
    const res = await apiValidate(savedKey, deviceHash, true);

    if (res.ok && res.data.valid) {
        await storeValidLicense(savedKey, res.data);
    } else if (res.data.reason === 'network') {
        showGate();
        gateInput.value = savedKey;
        setError(reasonText('network'));
    } else {
        await chrome.storage.local.remove([
            STORAGE_KEYS.key,
            STORAGE_KEYS.lastCheck,
            STORAGE_KEYS.licenseInfo,
        ]);
        showGate();
        gateInput.value = '';
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

    if (res.ok && res.data.valid) {
        await storeValidLicense(key, res.data);
    } else {
        setError(reasonText(res.data.reason));
    }
}

async function handleLogout() {
    await chrome.storage.local.remove([
        STORAGE_KEYS.key,
        STORAGE_KEYS.lastCheck,
        STORAGE_KEYS.licenseInfo,
    ]);
    try { await window.__lvblBranding?.setBrandingCode(null); } catch {}
    gateInput.value = '';
    setError('');
    showGate();
}

// bootstrap
gateForm.addEventListener('submit', handleActivate);
if (licenseLogoutBtn) licenseLogoutBtn.addEventListener('click', handleLogout);
const licenseLogoutTopBtn = document.getElementById('licenseLogoutTop');
if (licenseLogoutTopBtn) licenseLogoutTopBtn.addEventListener('click', handleLogout);

// Auto-uppercase e format helper leve
gateInput.addEventListener('input', () => {
    const p = gateInput.selectionStart;
    gateInput.value = gateInput.value.toUpperCase();
    gateInput.setSelectionRange(p, p);
});

// Aplica branding armazenado imediatamente (antes de qualquer chamada de rede)
try { window.__lvblBranding?.applyStoredBranding(); } catch {}

tryAutoValidate();
