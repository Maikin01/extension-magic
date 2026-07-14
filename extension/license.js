// License gate — controla acesso ao chat sem tocar em popup.js
// Roda ANTES de popup.js e mantém o chat oculto até validar a chave.

const LICENSE_API_BASE = 'https://vamos-extend-buddy.lovable.app';
const STORAGE_KEYS = {
    key: 'lvbl_license_key',
    deviceHash: 'lvbl_device_hash',
    lastCheck: 'lvbl_last_check',
    licenseInfo: 'lvbl_license_info',
};
const REVALIDATE_INTERVAL_MS = 30 * 1000; // 30s — validação rígida
const POLL_INTERVAL_MS = 30 * 1000; // poll periódico enquanto o popup está aberto
const OFFLINE_GRACE_MS = 5 * 60 * 1000; // tolerância curta quando não há rede

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

function showGate() {
    gate.style.display = 'flex';
    chatShell.style.display = 'none';
    licenseInfoBar.style.display = 'none';
    setTimeout(() => gateInput?.focus(), 50);
}

function showChat(_info) {
    gate.style.display = 'none';
    chatShell.style.display = 'flex';
    if (licenseInfoBar) licenseInfoBar.style.display = 'none';
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

let pollTimer = null;
let validating = false;

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
        revalidateNow({ silent: true });
    }, POLL_INTERVAL_MS);
}

async function lockOut(reason, savedKey) {
    stopPolling();
    await chrome.storage.local.remove([
        STORAGE_KEYS.licenseInfo,
        STORAGE_KEYS.lastCheck,
    ]);
    // Se a chave foi apagada/revogada no servidor, também removemos a chave salva
    // para o usuário digitar novamente. Em caso de rede/erro transitório mantemos.
    const hardReasons = ['not_found', 'revoked', 'suspended', 'expired', 'device_mismatch', 'invalid_key', 'invalid_payload'];
    if (hardReasons.includes(reason)) {
        await chrome.storage.local.remove([STORAGE_KEYS.key]);
        gateInput.value = '';
    } else if (savedKey) {
        gateInput.value = savedKey;
    }
    showGate();
    setError(reasonText(reason));
}

async function revalidateNow({ silent = false } = {}) {
    if (validating) return;
    validating = true;
    try {
        const stored = await chrome.storage.local.get([
            STORAGE_KEYS.key,
            STORAGE_KEYS.licenseInfo,
            STORAGE_KEYS.lastCheck,
        ]);
        const savedKey = stored[STORAGE_KEYS.key];
        if (!savedKey) {
            stopPolling();
            showGate();
            return;
        }

        const deviceHash = await getOrCreateDeviceHash();
        const res = await apiValidate(savedKey, deviceHash);

        if (res.ok && res.data.valid) {
            await chrome.storage.local.set({
                [STORAGE_KEYS.lastCheck]: Date.now(),
                [STORAGE_KEYS.licenseInfo]: res.data,
            });
            showChat(res.data);
            startPolling();
            return;
        }

        const reason = res.data?.reason;

        if (reason === 'network') {
            // Rede: tolerância curta apenas se tivermos uma validação recente bem-sucedida
            const lastCheck = stored[STORAGE_KEYS.lastCheck] || 0;
            const withinGrace = Date.now() - lastCheck < OFFLINE_GRACE_MS;
            if (withinGrace && stored[STORAGE_KEYS.licenseInfo]) {
                showChat(stored[STORAGE_KEYS.licenseInfo]);
                startPolling();
                return;
            }
            await lockOut('network', savedKey);
            return;
        }

        // Qualquer outra resposta do servidor = trava imediatamente
        await lockOut(reason || 'invalid_key', savedKey);
    } finally {
        validating = false;
    }
}

async function tryAutoValidate() {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.key]);
    if (!stored[STORAGE_KEYS.key]) {
        showGate();
        return;
    }
    // Não confiar no cache: sempre valida contra o servidor antes de liberar
    gate.style.display = 'flex';
    chatShell.style.display = 'none';
    gateStatus.textContent = 'Validando licença...';
    await revalidateNow({ silent: false });
    gateStatus.textContent = '';
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
        await chrome.storage.local.set({
            [STORAGE_KEYS.key]: key,
            [STORAGE_KEYS.lastCheck]: Date.now(),
            [STORAGE_KEYS.licenseInfo]: res.data,
        });
        showChat(res.data);
        startPolling();
    } else {
        setError(reasonText(res.data.reason));
    }
}

async function handleLogout() {
    stopPolling();
    await chrome.storage.local.remove([
        STORAGE_KEYS.key,
        STORAGE_KEYS.lastCheck,
        STORAGE_KEYS.licenseInfo,
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

// Revalidação quando a janela volta a ficar visível/focada
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') revalidateNow({ silent: true });
});
window.addEventListener('focus', () => revalidateNow({ silent: true }));



// Auto-uppercase e format helper leve
gateInput.addEventListener('input', () => {
    const p = gateInput.selectionStart;
    gateInput.value = gateInput.value.toUpperCase();
    gateInput.setSelectionRange(p, p);
});

tryAutoValidate();
