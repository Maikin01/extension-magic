// content-shield.js
// Quando o "Escudo" está ativo, desenha uma barreira visual (position: fixed)
// sobre o composer do chat nativo do lovable.dev, impedindo digitação/envio.
// A barreira é ancorada nas coordenadas do textarea e reposicionada a cada
// frame, o que evita depender de ancestrais com layout específico.

(function () {
    'use strict';

    const FLAG_KEY = 'lvbl_shield_active';
    const OVERLAY_ID = 'rise-infinity-shield-overlay';
    const STYLE_ID = 'rise-infinity-shield-style';

    let enabled = false;
    let rafId = null;
    let overlayEl = null;

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = `
            #${OVERLAY_ID} {
                position: fixed;
                z-index: 2147483000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: rgba(10, 6, 20, 0.92);
                border: 1.5px solid #7c3aed;
                border-radius: 14px;
                color: #fff;
                font: 600 13px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                text-align: center;
                padding: 16px;
                backdrop-filter: blur(3px);
                cursor: not-allowed;
                user-select: none;
                pointer-events: auto;
                box-shadow: 0 10px 30px rgba(0,0,0,.45);
            }
            #${OVERLAY_ID} .ri-shield-icon { width: 34px; height: 34px; color: #a78bfa; }
            #${OVERLAY_ID} .ri-shield-title { color: #c4b5fd; font-size: 14px; display:flex; align-items:center; gap:6px; }
            #${OVERLAY_ID} .ri-shield-sub { color: #d1d5db; font-weight: 500; font-size: 12px; opacity:.9; }
        `;
        document.documentElement.appendChild(s);
    }

    function findComposerRect() {
        // Escolhe a última textarea visível na página (composer costuma ser essa).
        const textareas = Array.from(document.querySelectorAll('textarea'))
            .filter((t) => {
                const r = t.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && t.offsetParent !== null;
            });
        const ta = textareas[textareas.length - 1];
        if (!ta) return null;
        // Sobe até um contêiner "caixa" (form ou div maior) para cobrir botões.
        let node = ta.closest('form') || ta.parentElement || ta;
        for (let i = 0; i < 5 && node && node.parentElement; i++) {
            const r = node.getBoundingClientRect();
            if (r.height >= 90 && r.width >= 260) break;
            node = node.parentElement;
        }
        return { rect: node.getBoundingClientRect(), textarea: ta, host: node };
    }

    function buildOverlay() {
        const el = document.createElement('div');
        el.id = OVERLAY_ID;
        el.innerHTML = `
            <svg class="ri-shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div class="ri-shield-title">🛡 Protegido pelo Rise Infinity</div>
            <div class="ri-shield-sub">Use a extensão para enviar prompts</div>
        `;
        ['click', 'mousedown', 'keydown', 'pointerdown', 'touchstart', 'wheel'].forEach((evt) => {
            el.addEventListener(evt, (e) => { e.stopPropagation(); e.preventDefault(); }, true);
        });
        return el;
    }

    function disableComposerControls(host) {
        if (!host) return;
        host.querySelectorAll('textarea, button, [contenteditable="true"]').forEach((el) => {
            if (el.getAttribute('data-ri-shield-disabled') === '1') return;
            el.setAttribute('data-ri-shield-disabled', '1');
            if ('disabled' in el && !el.disabled) {
                el.setAttribute('data-ri-was-enabled', '1');
                el.disabled = true;
            }
            if (el.getAttribute('contenteditable') === 'true') {
                el.setAttribute('data-ri-prev-ce', 'true');
                el.setAttribute('contenteditable', 'false');
            }
        });
    }

    function reenableControls() {
        document.querySelectorAll('[data-ri-shield-disabled="1"]').forEach((el) => {
            el.removeAttribute('data-ri-shield-disabled');
            if (el.getAttribute('data-ri-was-enabled') === '1') {
                if ('disabled' in el) el.disabled = false;
                el.removeAttribute('data-ri-was-enabled');
            }
            if (el.getAttribute('data-ri-prev-ce') === 'true') {
                el.setAttribute('contenteditable', 'true');
                el.removeAttribute('data-ri-prev-ce');
            }
        });
    }

    function tick() {
        if (!enabled) { rafId = null; return; }
        ensureStyle();
        const found = findComposerRect();
        if (!found) {
            if (overlayEl) overlayEl.style.display = 'none';
            rafId = requestAnimationFrame(tick);
            return;
        }
        if (!overlayEl || !document.body.contains(overlayEl)) {
            overlayEl = buildOverlay();
            document.body.appendChild(overlayEl);
        }
        const r = found.rect;
        overlayEl.style.display = 'flex';
        overlayEl.style.left = `${r.left}px`;
        overlayEl.style.top = `${r.top}px`;
        overlayEl.style.width = `${r.width}px`;
        overlayEl.style.height = `${r.height}px`;
        disableComposerControls(found.host);
        rafId = requestAnimationFrame(tick);
    }

    function start() {
        if (rafId != null) return;
        rafId = requestAnimationFrame(tick);
    }
    function stop() {
        if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
        if (overlayEl) { overlayEl.remove(); overlayEl = null; }
        reenableControls();
    }

    try {
        chrome.storage.local.get([FLAG_KEY], (v) => {
            enabled = !!v[FLAG_KEY];
            if (enabled) start();
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && FLAG_KEY in changes) {
                enabled = !!changes[FLAG_KEY].newValue;
                if (enabled) start(); else stop();
            }
        });
    } catch (_) {}

    console.log('[lvbl-shield] content script loaded (fixed-overlay mode)');
})();
