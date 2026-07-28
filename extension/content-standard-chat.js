// content-standard-chat.js
// Modo "Chat Padrão": quando ativo, o chat original do lovable.dev NÃO usa o
// envio nativo. A mensagem é capturada antes do app e enviada pelo mesmo
// payload sem crédito usado pela extensão.

(function () {
    'use strict';

    const FLAG_KEY = 'lvbl_use_standard_chat';
    
    const EDITOR_SELECTOR = [
        'textarea',
        'input[type="text"]',
        'input:not([type])',
        '[contenteditable]:not([contenteditable="false"])',
        '[role="textbox"]',
        '[aria-multiline="true"]',
        '.ProseMirror',
        '[data-lexical-editor="true"]',
        '[data-slate-editor="true"]',
    ].join(',');
    let enabled = false;
    let sending = false;
    let creatingProject = false;
    let toastEl = null;
    let toastTimer = null;

    // Injeta patch de fetch/XHR no contexto da página (mundo MAIN) para poder
    // reescrever o body da requisição de criação de projeto quando pedido.
    try {
        const s = document.createElement('script');
        s.src = chrome.runtime.getURL('page-fetch-patch.js');
        s.async = false;
        (document.head || document.documentElement).appendChild(s);
        s.onload = () => s.remove();
    } catch (_) {}

    try {
        chrome.storage.local.get([FLAG_KEY], (v) => {
            enabled = !!v[FLAG_KEY];
            window.__lvblStandardChatEnabled = enabled;
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && FLAG_KEY in changes) {
                enabled = !!changes[FLAG_KEY].newValue;
                window.__lvblStandardChatEnabled = enabled;
                showToast(enabled ? '🛡 Chat Padrão ATIVO' : '⚪ Chat Padrão desativado');
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
            contains_error: false,
            error_ids: [],
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
        return Array.from(root.querySelectorAll(EDITOR_SELECTOR)).filter(isVisible);
    }

    function findComposerEditor(fromEl) {
        if (fromEl) {
            const direct = fromEl.closest?.(EDITOR_SELECTOR);
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

        // Envia via background service worker para replicar exatamente o
        // fetch que o popup da extensão faz (mesmos headers Bearer/Cookie/
        // Origin/Referer/User-Agent), que é o envio sem consumir créditos.
        const resp = await new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage(
                    { action: 'sendStandardChat', projectId, body: buildBody(message) },
                    (r) => resolve(r || { success: false, error: 'sem resposta' })
                );
            } catch (e) {
                resolve({ success: false, error: e && e.message ? e.message : String(e) });
            }
        });

        if (!resp || !resp.success) {
            console.warn('[std-chat] send failed', resp);
            showToast(`❌ Falha no envio: ${resp && resp.error ? resp.error : 'erro desconhecido'}`);
            return false;
        }

        showToast('✅ Enviado pelo chat padrão');
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

        if (/attach|anexar|upload|file|arquivo|voice|microphone|mic|dictate|áudio|audio|menu|settings|config|stop|cancel/.test(label)) {
            return false;
        }

        if (btn.type === 'submit' || /\b(send|enviar|submit)\b/i.test(label)) return true;
        if (btn.querySelector('svg[data-icon="send"], svg[data-icon="arrow-up"], [data-testid*="send" i], [data-testid*="arrow" i], [aria-label*="send" i], [aria-label*="enviar" i]')) {
            return true;
        }

        const svgs = btn.querySelectorAll('svg');
        for (const svg of svgs) {
            const d = Array.from(svg.querySelectorAll('path')).map((p) => p.getAttribute('d') || '').join(' ');
            if (/M\s*12\s+1?9?.*V\s*5|m?\s*5\s+12\s+7-?7\s+7\s+7|l-?7\s+7|arrow.*up|send/i.test(d)) return true;
        }

        return false;
    }

    // Bloqueia Enter antes do chat oficial processar.
    document.addEventListener('keydown', (e) => {
        if (!enabled || creatingProject || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
        const editor = findComposerEditor(e.target);
        if (!editor) return;
        intercept(e, editor);
    }, true);

    // Bloqueia clique/pointer em botão enviar antes do handler oficial.
    ['pointerdown', 'mousedown', 'click'].forEach((type) => {
        document.addEventListener(type, (e) => {
            if (!enabled || creatingProject) return;
            const btn = e.target?.closest?.('button');
            if (!buttonLooksLikeSend(btn)) return;
            const editor = findComposerEditor(btn);
            if (!editor || !getEditorText(editor).trim()) return;
            intercept(e, editor);
        }, true);
    });

    // Bloqueia submit de forms, caso o app envie por submit ao invés de click.
    document.addEventListener('submit', (e) => {
        if (!enabled || creatingProject) return;
        const editor = findComposerEditor(e.target);
        if (!editor || !getEditorText(editor).trim()) return;
        intercept(e, editor);
    }, true);

    // ---------- Criar Novo Projeto (dashboard) ----------
    // Recebe pedido do popup/background para preencher o composer da dashboard
    // com "." e disparar o envio nativo (criação de projeto novo é gratuita).
    function setEditorText(el, text) {
        if (!el) return false;
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'textarea' || tag === 'input') {
            try {
                const proto = tag === 'textarea' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                if (setter) setter.call(el, text);
                else el.value = text;
            } catch (_) { el.value = text; }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }
        try { el.focus?.(); } catch (_) {}
        el.textContent = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        return true;
    }

    function isCreateProjectEditor(el) {
        if (!isVisible(el)) return false;
        const rect = el.getBoundingClientRect();
        if (rect.top < 80 || rect.bottom > window.innerHeight - 20) return false;
        const label = [
            el.getAttribute('aria-label'),
            el.getAttribute('placeholder'),
            el.getAttribute('data-placeholder'),
            el.closest?.('form')?.textContent,
            el.closest?.('[data-testid], section, main, div')?.textContent,
        ].filter(Boolean).join(' ').toLowerCase();
        if (/share\s+lovable|earn\s+credits|ganhar\s+cr[eé]ditos|invite|referral/.test(label)) return false;
        return /ask|prompt|describe|build|create|criar|projeto|app|site|idea|what do you want|o que voc[eê]/.test(label)
            || ['textarea', 'input'].includes((el.tagName || '').toLowerCase())
            || el.matches?.('[contenteditable="true"],[role="textbox"],.ProseMirror,[data-lexical-editor="true"]');
    }

    function buttonIsInsideEditor(btn, editor) {
        if (!btn || !editor) return false;
        return btn.contains(editor) || editor.contains(btn);
    }

    function buttonLooksLikeCreateSend(btn, editor) {
        if (!btn || btn.disabled || buttonIsInsideEditor(btn, editor) || !isVisible(btn)) return false;
        const label = [
            btn.getAttribute('aria-label'),
            btn.getAttribute('title'),
            btn.getAttribute('data-testid'),
            btn.textContent,
        ].filter(Boolean).join(' ').toLowerCase();
        if (/share\s+lovable|earn\s+credits|ganhar\s+cr[eé]ditos|invite|referral|copy\s+link|upgrade|attach|design|connector|database|voice|microphone|mic|dictate/.test(label)) return false;
        // Deve estar próximo do editor (mesma região)
        const rect = btn.getBoundingClientRect();
        const editorRect = editor.getBoundingClientRect();
        const dy = Math.max(0, Math.max(editorRect.top - rect.bottom, rect.top - editorRect.bottom));
        const dx = Math.max(0, Math.max(editorRect.left - rect.right, rect.left - editorRect.right));
        if (dy > 120 || dx > 200) return false;

        if (btn.type === 'submit') return true;
        if (/\b(send|enviar|submit)\b/i.test(label)) return true;
        if (btn.querySelector('svg[data-icon="send"], svg[data-icon="arrow-up"], [data-testid*="send" i], [aria-label*="send" i], [aria-label*="enviar" i]')) return true;
        // Ícone de seta pra cima (SVG genérico) — verifica paths
        const svgs = btn.querySelectorAll('svg');
        for (const svg of svgs) {
            const d = Array.from(svg.querySelectorAll('path')).map((p) => p.getAttribute('d') || '').join(' ');
            // Setas para cima geralmente têm "M12 19V5" ou "l-7 7" ou similar
            if (/M\s*12\s+1?9?.*V\s*5|l-?7\s+7|arrow.*up/i.test(d)) return true;
        }
        return false;
    }

    function findSendButtonNear(editor) {
        if (!editor) return null;
        const form = editor.closest?.('form');
        const scopes = new Set();
        if (form) scopes.add(form);
        const container = editor.closest?.('[data-testid], section, main, div[class*="composer" i], div[class*="chat" i]');
        if (container) scopes.add(container);
        // fallback: parent chain until we have some buttons
        let node = editor.parentElement;
        for (let i = 0; i < 6 && node; i++) {
            if (node.querySelector('button')) { scopes.add(node); break; }
            node = node.parentElement;
        }
        for (const scope of scopes) {
            const btns = Array.from(scope.querySelectorAll('button'));
            const send = btns.find((b) => buttonLooksLikeCreateSend(b, editor));
            if (send) return send;
        }
        return null;
    }

    function dispatchEnter(editor) {
        const evOpts = { bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13, view: window };
        editor.dispatchEvent(new KeyboardEvent('keydown', evOpts));
        editor.dispatchEvent(new KeyboardEvent('keypress', evOpts));
        editor.dispatchEvent(new KeyboardEvent('keyup', evOpts));
    }

    async function waitForSendButton(editor, maxMs = 3000) {
        const start = Date.now();
        while (Date.now() - start < maxMs) {
            const btn = findSendButtonNear(editor);
            if (btn && !btn.disabled) return btn;
            await new Promise((r) => setTimeout(r, 120));
        }
        return findSendButtonNear(editor);
    }

    async function triggerCreateNewProject() {
        // Espera a UI ficar disponível
        let editor = null;
        for (let i = 0; i < 30; i++) {
            editor = candidateEditors(document)
                .filter(isCreateProjectEditor)
                .sort((a, b) => {
                    const ar = a.getBoundingClientRect();
                    const br = b.getBoundingClientRect();
                    return (br.width * br.height) - (ar.width * ar.height);
                })[0];
            if (editor) break;
            await new Promise((r) => setTimeout(r, 300));
        }
        if (!editor) throw new Error('Chat da tela inicial da Lovable não encontrado. Abra lovable.dev na tela inicial e tente novamente.');

        try { editor.focus?.(); } catch (_) {}
        setEditorText(editor, '.');
        showToast('🚀 Criando novo projeto…');

        // Enquanto criando projeto, o interceptor do chat padrão fica desligado
        creatingProject = true;
        try {
            // Aguarda o React re-renderizar e habilitar o botão de envio
            const btn = await waitForSendButton(editor, 3000);
            if (btn) {
                // Simula um clique humano completo
                const rect = btn.getBoundingClientRect();
                const opts = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, button: 0 };
                btn.dispatchEvent(new PointerEvent('pointerdown', opts));
                btn.dispatchEvent(new MouseEvent('mousedown', opts));
                btn.dispatchEvent(new PointerEvent('pointerup', opts));
                btn.dispatchEvent(new MouseEvent('mouseup', opts));
                btn.dispatchEvent(new MouseEvent('click', opts));
                btn.click();
            } else {
                // Fallback: form.requestSubmit + Enter
                const form = editor.closest?.('form');
                if (form?.requestSubmit) {
                    try { form.requestSubmit(); } catch (_) { form.submit?.(); }
                }
                dispatchEnter(editor);
            }
        } finally {
            setTimeout(() => { creatingProject = false; }, 1500);
        }
        return true;
    }

    try {
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (msg && msg.action === 'lvbl_standard_chat_set') {
                enabled = !!msg.enabled;
                window.__lvblStandardChatEnabled = enabled;
                showToast(enabled ? '🛡 Chat Padrão ATIVO' : '⚪ Chat Padrão desativado');
                sendResponse({ ok: true, enabled });
                return false;
            }

            if (msg && msg.action === 'lvbl_standard_chat_status') {
                sendResponse({ ok: true, enabled });
                return false;
            }

            if (msg && msg.action === 'lvbl_create_new_project') {
                triggerCreateNewProject()
                    .then(() => sendResponse({ ok: true }))
                    .catch((err) => sendResponse({ ok: false, error: err.message }));
                return true;
            }
        });
    } catch (_) {}

    console.log('[lvbl-std-chat] content script loaded');
})();