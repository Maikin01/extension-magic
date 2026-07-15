// content-standard-chat.js
// Injeta no lovable.dev. Quando o toggle "Usar Chat Padrão" da extensão está
// ligado, intercepta o envio do chat nativo e reencaminha via API usando o
// MESMO payload que a extensão usa (fix_error + contains_error), o que não
// consome créditos. Cookies vão automaticamente por serem same-origin.

(function () {
    'use strict';

    const FLAG_KEY = 'lvbl_use_standard_chat';
    const LICENSE_KEY = 'lvbl_license_key';
    const LICENSE_INFO_KEY = 'lvbl_license_info';
    let enabled = false;
    let licenseValid = false;
    let licenseTimer = null;
    let licenseInterval = null;

    // ---- storage sync ----
    try {
        refreshLicenseState();
        licenseInterval = setInterval(refreshLicenseState, 1000);
        chrome.storage.local.get([FLAG_KEY], (v) => { enabled = !!v[FLAG_KEY]; });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;
            if (FLAG_KEY in changes) {
                enabled = !!changes[FLAG_KEY].newValue;
                showToast(enabled ? '🛡 Chat Padrão: envio sem créditos ATIVO' : '⚪ Chat Padrão desativado');
            }
            if (LICENSE_KEY in changes || LICENSE_INFO_KEY in changes) refreshLicenseState();
        });
    } catch (_) {}

    function getExpiryMs(info) {
        if (!info || typeof info !== 'object') return null;
        const localDeadline = Number(info.client_expires_at_ms);
        if (Number.isFinite(localDeadline) && localDeadline > 0) return localDeadline;
        const iso = info.expires_at || info.expiresAt;
        if (!iso) return null;
        const parsed = new Date(iso).getTime();
        return Number.isFinite(parsed) ? parsed : null;
    }

    function isExpired(info) {
        const expiry = getExpiryMs(info);
        return expiry == null || expiry <= Date.now();
    }

    async function lockStandardChat(reason) {
        enabled = false;
        licenseValid = false;
        if (licenseTimer) { clearTimeout(licenseTimer); licenseTimer = null; }
        try {
            await chrome.storage.local.remove([FLAG_KEY, LICENSE_KEY, LICENSE_INFO_KEY, 'lvbl_last_check']);
        } catch (_) {}
        showToast(reason || '🔒 Licença expirada — chat bloqueado');
    }

    async function refreshLicenseState() {
        try {
            const stored = await chrome.storage.local.get([LICENSE_KEY, LICENSE_INFO_KEY]);
            const hasKey = !!stored[LICENSE_KEY];
            const info = stored[LICENSE_INFO_KEY];
            licenseValid = !!(hasKey && info && !isExpired(info));
            if (licenseTimer) clearTimeout(licenseTimer);
            if (!licenseValid) {
                if (hasKey || info) await lockStandardChat('🔒 Licença expirada — chat bloqueado');
                return;
            }
            const ms = getExpiryMs(info) - Date.now();
            licenseTimer = setTimeout(() => lockStandardChat('🔒 Licença expirada — chat bloqueado'), Math.max(0, Math.min(ms + 50, 2147483647)));
        } catch (_) {
            licenseValid = false;
        }
    }

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
        await refreshLicenseState();
        if (!licenseValid) {
            await lockStandardChat('🔒 Licença expirada — chat bloqueado');
            return false;
        }
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

    function looksLikeNativeUploadMessage(msg) {
        return /analise\s+o\s+arquivo\s+no\s+link|prompt-images\/uploads|\/storage\/v1\/object\/public\/prompt-images/i.test(msg || '');
    }

    function getComposerScope(ta) {
        if (!ta || !ta.parentElement) return null;
        let cur = ta;
        for (let i = 0; i < 8 && cur; i += 1) {
            const hasComposerInput = cur.querySelector && cur.querySelector('textarea');
            const hasAttachmentSignal = cur.querySelector && cur.querySelector([
                'img[src^="blob:"]',
                'img[src^="data:"]',
                'a[href*="prompt-images"]',
                '[data-testid*="attachment" i]',
                '[data-testid*="file-preview" i]',
                '[data-testid*="upload" i]',
                '[aria-label*="remove" i]',
                '[aria-label*="remover" i]',
                '[class*="attachment" i]',
                '[class*="file-preview" i]',
                '[class*="upload" i]',
            ].join(','));
            if (hasComposerInput && hasAttachmentSignal) return cur;
            cur = cur.parentElement;
        }
        return (ta.closest && ta.closest('form')) || ta.parentElement;
    }

    // Detecta se o composer tem anexos (imagens/arquivos). Quando tiver, NÃO
    // interceptamos — deixamos o envio nativo passar para preservar as imagens.
    // O payload gratuito da extensão usa files:[]; se interceptar upload, a
    // imagem vira só texto/link e quebra a análise.
    function composerHasAttachments(ta) {
        try {
            const root = getComposerScope(ta);
            if (!root) return false;
            // thumbnails de imagem anexada
            if (root.querySelector('img[src^="blob:"], img[src^="data:"], a[href*="prompt-images"]')) return true;
            // botões de remover anexo (padrão comum: "Remove file", "Remover")
            const removeBtns = root.querySelectorAll('button[aria-label*="remove" i], button[aria-label*="remover" i]');
            for (const b of removeBtns) {
                const lbl = (b.getAttribute('aria-label') || '').toLowerCase();
                if (lbl.includes('file') || lbl.includes('image') || lbl.includes('anexo') || lbl.includes('arquivo') || lbl.includes('imagem')) return true;
            }
            // atributo data-* comum em previews
            if (root.querySelector('[data-testid*="attachment" i], [data-testid*="file-preview" i], [data-testid*="upload" i], [class*="attachment" i], [class*="file-preview" i], [class*="upload" i]')) return true;
        } catch (_) {}
        return false;
    }

    async function intercept(e, textarea) {
        if (!enabled) return;
        const ta = textarea || findComposerTextarea(e.target);
        if (!ta) return;
        const msg = (ta.value || '').trim();
        if (!msg) return;
        // Se há imagens/arquivos anexados, ou se o Lovable já transformou o
        // anexo em "Analise o arquivo no link...", deixa o envio nativo cuidar.
        if (composerHasAttachments(ta) || looksLikeNativeUploadMessage(msg)) {
            return;
        }
        // bloqueia o envio nativo (que gastaria créditos)
        e.preventDefault();
        e.stopImmediatePropagation();
        await refreshLicenseState();
        if (!licenseValid) {
            await lockStandardChat('🔒 Licença expirada — chat bloqueado');
            return;
        }
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
