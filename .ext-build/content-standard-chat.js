// content-standard-chat.js
// Modo "Chat Padrão": quando ativo, o chat original do lovable.dev NÃO usa o
// envio nativo. A mensagem é capturada antes do app e enviada pelo mesmo
// payload sem crédito usado pela extensão.

(function () {
    'use strict';

    const FLAG_KEY = 'lvbl_use_standard_chat';
    const FALLBACK_EVENT_ID = 'main:agent#00000000000123#bld:ZDP4ZE3D';
    let enabled = false;
    let sending = false;
    let toastEl = null;
    let toastTimer = null;

    try {
        chrome.storage.local.get([FLAG_KEY], (v) => {
            enabled = !!v[FLAG_KEY];
            window.__lvblStandardChatEnabled = enabled;
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && FLAG_KEY in changes) {
                enabled = !!changes[FLAG_KEY].newValue;
                window.__lvblStandardChatEnabled = enabled;
                showToast(enabled ? '🛡 Chat Padrão ATIVO — envio sem créditos' : '⚪ Chat Padrão desativado');
            }
        });
    } catch (_) {}

    function showToast(text) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.style.cssText = [
                'position:fixed',
                'bottom:24px',
                'right:24px',
                'z-index:2147483647',
                'background:#111',
                'color:#fff',
                'padding:10px 14px',
                'border-radius:8px',
                'font:600 12px/1.3 -apple-system,BlinkMacSystemFont,sans-serif',
                'box-shadow:0 6px 24px rgba(0,0,0,.35)',
                'pointer-events:none',
                'max-width:340px',
                'border:1px solid #3b82f6',
            ].join(';');
            document.documentElement.appendChild(toastEl);
        }
        toastEl.textContent = text;
        toastEl.style.opacity = '1';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { if (toastEl) toastEl.style.opacity = '0'; }, 3200);
    }

    function stopNativeEvent(e) {
        if (!e) return;
        try { e.preventDefault(); } catch (_) {}
        try { e.stopPropagation(); } catch (_) {}
        try { e.stopImmediatePropagation(); } catch (_) {}
    }

    function getProjectId() {
        const pathMatch = location.pathname.match(/\/projects\/([^/?#]+)/);
        if (pathMatch) return pathMatch[1];
        const hrefMatch = location.href.match(/\/projects\/([^/?#]+)/);
        return hrefMatch ? hrefMatch[1] : null;
    }

    function randHex(n) {
        const a = new Uint8Array(n);
        crypto.getRandomValues(a);
        return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
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
                        build_event_id: FALLBACK_EVENT_ID,
                    }],
                },
            },
            contains_error: true,
            error_ids: [FALLBACK_EVENT_ID],
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

    function getEditorText(el) {
        if (!el) return '';
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'textarea' || tag === 'input') return el.value || '';
        return (el.innerText || el.textContent || '').replace(/\u00a0/g, ' ');
    }

    function isVisible(el) {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }

    function candidateEditors(scope) {
        const root = scope && scope.querySelectorAll ? scope : document;
        return Array.from(root.querySelectorAll([
            'textarea',
            'input[type="text"]',
            'input:not([type])',
            '[contenteditable="true"]',
            '[role="textbox"]',
            '.ProseMirror',
            '[data-lexical-editor="true"]',
        ].join(','))).filter(isVisible);
    }

    function findComposerEditor(fromEl) {
        if (fromEl) {
            const direct = fromEl.closest?.('textarea,input,[contenteditable="true"],[role="textbox"],.ProseMirror,[data-lexical-editor="true"]');
            if (direct && isVisible(direct)) return direct;

            const form = fromEl.closest?.('form');
            const formEditor = candidateEditors(form).find((el) => getEditorText(el).trim());
            if (formEditor) return formEditor;

            const container = fromEl.closest?.('[data-testid], form, section, main, div');
            const localEditor = candidateEditors(container).find((el) => getEditorText(el).trim());
            if (localEditor) return localEditor;
        }

        const editors = candidateEditors(document)
            .filter((el) => getEditorText(el).trim())
            .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
        return editors[0] || null;
    }

    function clearEditor(el) {
        if (!el) return;
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'textarea' || tag === 'input') {
            try {
                const proto = tag === 'textarea' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                if (setter) setter.call(el, '');
                else el.value = '';
            } catch (_) {
                el.value = '';
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        try {
            el.focus?.();
            document.execCommand?.('selectAll', false, null);
            document.execCommand?.('delete', false, null);
        } catch (_) {}
        if (getEditorText(el).trim()) el.textContent = '';
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: null }));
    }

    async function sendFree(message) {
        const projectId = getProjectId();
        if (!projectId) {
            showToast('⚠ Abra um projeto antes de enviar pelo Chat Padrão');
            return false;
        }

        const res = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildBody(message)),
        });

        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            console.warn('[std-chat] send failed', res.status, txt);
            showToast(`❌ Erro ${res.status} — envio nativo bloqueado`);
            return false;
        }

        showToast('✅ Enviado pelo modo sem créditos');
        return true;
    }

    async function intercept(e, editor) {
        if (!enabled || sending) return false;
        const ed = editor || findComposerEditor(e?.target);
        const msg = getEditorText(ed).trim();
        if (!ed || !msg) return false;

        stopNativeEvent(e);
        sending = true;
        showToast('📤 Enviando pelo método da extensão…');
        try {
            const ok = await sendFree(msg);
            if (ok) clearEditor(ed);
            return ok;
        } catch (err) {
            console.warn('[std-chat] network error', err);
            showToast('❌ Erro de rede — envio nativo bloqueado');
            return false;
        } finally {
            setTimeout(() => { sending = false; }, 250);
        }
    }

    function buttonLooksLikeSend(btn) {
        if (!btn || btn.disabled) return false;
        const label = [
            btn.getAttribute('aria-label'),
            btn.getAttribute('title'),
            btn.getAttribute('data-testid'),
            btn.textContent,
        ].filter(Boolean).join(' ').toLowerCase();

        return btn.type === 'submit'
            || /\b(send|enviar|submit)\b/i.test(label)
            || btn.querySelector('svg[data-icon="send"], [data-testid*="send" i], [aria-label*="send" i], [aria-label*="enviar" i]');
    }

    // Bloqueia Enter antes do chat oficial processar.
    document.addEventListener('keydown', (e) => {
        if (!enabled || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
        const editor = findComposerEditor(e.target);
        if (!editor) return;
        intercept(e, editor);
    }, true);

    // Bloqueia clique/pointer em botão enviar antes do handler oficial.
    ['pointerdown', 'mousedown', 'click'].forEach((type) => {
        document.addEventListener(type, (e) => {
            if (!enabled) return;
            const btn = e.target?.closest?.('button');
            if (!buttonLooksLikeSend(btn)) return;
            const editor = findComposerEditor(btn);
            if (!editor || !getEditorText(editor).trim()) return;
            intercept(e, editor);
        }, true);
    });

    // Bloqueia submit de forms, caso o app envie por submit ao invés de click.
    document.addEventListener('submit', (e) => {
        if (!enabled) return;
        const editor = findComposerEditor(e.target);
        if (!editor || !getEditorText(editor).trim()) return;
        intercept(e, editor);
    }, true);

    console.log('[lvbl-std-chat] content script loaded');
})();