// content-shield.js
// Quando o "Escudo" está ativo, injeta uma barreira visual sobre o chat nativo
// do lovable.dev impedindo o usuário de digitar/enviar por lá. O objetivo é
// forçar o uso do chat da extensão. Desativado = comportamento normal.

(function () {
    'use strict';

    const FLAG_KEY = 'lvbl_shield_active';
    const OVERLAY_ID = 'rise-infinity-shield-overlay';
    const STYLE_ID = 'rise-infinity-shield-style';

    let enabled = false;

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = `
            #${OVERLAY_ID} {
                position: absolute;
                inset: 0;
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
            }
            #${OVERLAY_ID} .ri-shield-icon {
                width: 34px; height: 34px;
                color: #a78bfa;
            }
            #${OVERLAY_ID} .ri-shield-title {
                color: #c4b5fd;
                font-size: 14px;
                display: flex; align-items: center; gap: 6px;
            }
            #${OVERLAY_ID} .ri-shield-sub {
                color: #d1d5db;
                font-weight: 500;
                font-size: 12px;
                opacity: .9;
            }
            .ri-shield-host { position: relative !important; }
        `;
        document.documentElement.appendChild(s);
    }

    function findComposerContainer() {
        // Procura a última textarea visível (o composer do chat) e sobe até um
        // ancestral com aparência de "caixa" (form ou div com padding/border).
        const textareas = Array.from(document.querySelectorAll('textarea'))
            .filter((t) => t.offsetParent !== null);
        const ta = textareas[textareas.length - 1];
        if (!ta) return null;
        let node = ta.closest('form') || ta.parentElement;
        // sobe alguns níveis para pegar a caixa inteira do composer
        for (let i = 0; i < 4 && node && node.parentElement; i++) {
            const r = node.getBoundingClientRect();
            if (r.height >= 90 && r.width >= 240) break;
            node = node.parentElement;
        }
        return node;
    }

    function buildOverlay() {
        const el = document.createElement('div');
        el.id = OVERLAY_ID;
        el.innerHTML = `
            <svg class="ri-shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div class="ri-shield-title">🛡 Protegido pelo Rise Infinity</div>
            <div class="ri-shield-sub">Use a extensão para enviar prompts</div>
        `;
        // Bloqueia qualquer interação
        ['click', 'mousedown', 'keydown', 'pointerdown', 'touchstart'].forEach((evt) => {
            el.addEventListener(evt, (e) => { e.stopPropagation(); e.preventDefault(); }, true);
        });
        return el;
    }

    function apply() {
        if (!enabled) return remove();
        ensureStyle();
        const host = findComposerContainer();
        if (!host) return;
        // Já existe um overlay? Verifica se ainda está no host certo.
        const existing = document.getElementById(OVERLAY_ID);
        if (existing && existing.parentElement === host) return;
        if (existing) existing.remove();

        host.classList.add('ri-shield-host');
        host.appendChild(buildOverlay());

        // Desabilita textareas e botões de envio dentro do host
        host.querySelectorAll('textarea, button, [contenteditable="true"]').forEach((el) => {
            el.setAttribute('data-ri-shield-disabled', '1');
            if ('disabled' in el) el.disabled = true;
            if (el.getAttribute('contenteditable') === 'true') {
                el.setAttribute('data-ri-prev-ce', 'true');
                el.setAttribute('contenteditable', 'false');
            }
        });
    }

    function remove() {
        const el = document.getElementById(OVERLAY_ID);
        if (el) {
            const host = el.parentElement;
            if (host) host.classList.remove('ri-shield-host');
            el.remove();
        }
        document.querySelectorAll('[data-ri-shield-disabled="1"]').forEach((el) => {
            el.removeAttribute('data-ri-shield-disabled');
            if ('disabled' in el) el.disabled = false;
            if (el.getAttribute('data-ri-prev-ce') === 'true') {
                el.setAttribute('contenteditable', 'true');
                el.removeAttribute('data-ri-prev-ce');
            }
        });
    }

    // Observa a página para reaplicar quando o chat re-renderiza
    const mo = new MutationObserver(() => { if (enabled) apply(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });

    // Estado inicial + reação a mudanças no toggle
    try {
        chrome.storage.local.get([FLAG_KEY], (v) => {
            enabled = !!v[FLAG_KEY];
            apply();
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && FLAG_KEY in changes) {
                enabled = !!changes[FLAG_KEY].newValue;
                if (enabled) apply(); else remove();
            }
        });
    } catch (_) {}

    console.log('[lvbl-shield] content script loaded');
})();
