// content-standard-chat.js
// Injeta no lovable.dev. Quando o toggle "Usar Chat Padrão" da extensão está
// ligado, intercepta o envio do chat nativo e reencaminha via API usando o
// MESMO payload que a extensão usa (fix_error + contains_error), o que não
// consome créditos. Cookies vão automaticamente por serem same-origin.

(function () {
    'use strict';

    const FLAG_KEY = 'lvbl_use_standard_chat';
    let enabled = false;

    // ---- storage sync ----
    try {
        chrome.storage.local.get([FLAG_KEY], (v) => { enabled = !!v[FLAG_KEY]; });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && FLAG_KEY in changes) {
                enabled = !!changes[FLAG_KEY].newValue;
                showToast(enabled ? '🛡 Chat Padrão: envio sem créditos ATIVO' : '⚪ Chat Padrão desativado');
            }
        });
    } catch (_) {}

    // ---- helpers ----
    function getProjectId() {
        const m = location.pathname.match(/\/projects\/([^/?#]+)/);
        return m ? m[1] : null;
    }

    function randHex(n) {
        const a = new Uint8Array(n);
        crypto.getRandomValues(a);
        return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
    }
    function randStr(n) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let s = '';
        for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }
    function messageIds() {
        const r = randHex(3);
        const r2 = randHex(2);
        return {
            userMessageId: `umsg_01ktevtptd${r2}s0d2${r}x8cq70a${randStr(4)}`,
            aiMessageId: `aimsg_01ktevtpvh${r}7n2rj62vz7`,
        };
    }

    function buildBody(message) {
        const ids = messageIds();
        return {
            id: ids.userMessageId,
            message,
            files: [],
            selected_elements: [],
            chat_only: false,
            optimisticImageUrls: [],
            intent: 'fix_error',
            message_intent_metadata: {
                fix_error_metadata: {
                    errors: [{
                        error_type: 'build',
                        error_message: '',
                        build_event_id: 'main:agent#00000000000123#bld:ZDP4ZE3D',
                    }],
                },
            },
            contains_error: true,
            error_ids: ['main:agent#00000000000123#bld:ZDP4ZE3D'],
            ai_message_id: ids.aiMessageId,
            thread_id: 'main',
            current_page: location.pathname,
            current_viewport_width: window.innerWidth,
            current_viewport_height: window.innerHeight,
            current_viewport_dpr: window.devicePixelRatio || 1,
            view: 'preview',
            view_description: 'The user is currently viewing the preview.',
            model: null,
            network_requests: [],
            runtime_errors: [],
            integration_metadata: {
                browser: {
                    preview_viewport_width: window.innerWidth,
                    preview_viewport_height: window.innerHeight,
                    is_logged_out: false,
                },
            },
        };
    }

    async function sendFree(message) {
        const projectId = getProjectId();
        if (!projectId) {
            showToast('⚠ Abra um projeto (/projects/...) antes de enviar');
            return false;
        }
        try {
            showToast('📤 Enviando via método da extensão…');
            const res = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://lovable.dev',
                    'Referer': 'https://lovable.dev/',
                },
                body: JSON.stringify(buildBody(message)),
            });
            if (!res.ok) {
                const txt = await res.text().catch(() => '');
                console.warn('[std-chat] send failed', res.status, txt);
                showToast(`❌ Erro ${res.status} — mensagem NÃO enviada`);
                return false;
            }
            showToast('✅ Enviado sem consumir créditos');
            return true;
        } catch (err) {
            console.warn('[std-chat] network error', err);
            showToast('❌ Erro de rede');
            return false;
        }
    }

    // ---- toast ----
    let toastEl = null;
    let toastTimer = null;
    function showToast(text) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.style.cssText = [
                'position:fixed', 'bottom:24px', 'right:24px', 'z-index:2147483647',
                'background:#111', 'color:#fff', 'padding:10px 14px', 'border-radius:8px',
                'font:600 12px/1.3 -apple-system,BlinkMacSystemFont,sans-serif',
                'box-shadow:0 6px 24px rgba(0,0,0,.35)', 'pointer-events:none',
                'max-width:320px', 'border:1px solid #3b82f6',
            ].join(';');
            document.documentElement.appendChild(toastEl);
        }
        toastEl.textContent = text;
        toastEl.style.opacity = '1';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { if (toastEl) toastEl.style.opacity = '0'; }, 3200);
    }

    // ---- interception ----
    function findComposerTextarea(fromEl) {
        // 1) elemento vindo do evento
        if (fromEl && fromEl.tagName === 'TEXTAREA') return fromEl;
        // 2) textarea dentro do form/click ancestor
        if (fromEl && fromEl.closest) {
            const form = fromEl.closest('form');
            if (form) {
                const ta = form.querySelector('textarea');
                if (ta) return ta;
            }
        }
        // 3) última textarea visível na página (composer costuma ser essa)
        const all = Array.from(document.querySelectorAll('textarea'));
        return all.reverse().find((t) => t.offsetParent !== null) || null;
    }

    async function intercept(e, textarea) {
        if (!enabled) return;
        const ta = textarea || findComposerTextarea(e.target);
        if (!ta) return;
        const msg = (ta.value || '').trim();
        if (!msg) return;
        // bloqueia o envio nativo (que gastaria créditos)
        e.preventDefault();
        e.stopImmediatePropagation();
        const ok = await sendFree(msg);
        if (ok) {
            // limpa o textarea da UI oficial
            try {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                setter.call(ta, '');
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            } catch (_) { ta.value = ''; }
        }
    }

    // Enter no textarea (sem shift)
    document.addEventListener('keydown', (e) => {
        if (!enabled) return;
        if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
        const t = e.target;
        if (!t || t.tagName !== 'TEXTAREA') return;
        intercept(e, t);
    }, true);

    // Click em botões que parecem "enviar"
    document.addEventListener('click', (e) => {
        if (!enabled) return;
        const btn = e.target && e.target.closest && e.target.closest('button');
        if (!btn) return;
        const label = (btn.getAttribute('aria-label') || btn.textContent || '').toLowerCase();
        const isSend =
            btn.type === 'submit' ||
            label.includes('send') || label.includes('enviar') ||
            btn.querySelector('svg[data-icon="send"], [data-testid*="send" i]');
        if (!isSend) return;
        const ta = findComposerTextarea(btn);
        if (!ta || !ta.value.trim()) return;
        intercept(e, ta);
    }, true);

    console.log('[lvbl-std-chat] content script loaded');
})();
