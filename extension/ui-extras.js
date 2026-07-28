// ui-extras.js — wiring visual/funções adjacentes SEM tocar no envio, cookies ou auth.
// Roda depois de license.js, popup.js e history.js. Só lê estado já exposto.

(function () {
    'use strict';

    // ---------- Tabs ----------
    function initTabs() {
        const tabs = document.querySelectorAll('.tab');
        const panels = document.querySelectorAll('.tab-panel');
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                tabs.forEach((t) => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.dataset.tab;
                panels.forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== target));
                if (target === 'historico') renderHistory();
            });
        });
    }

    // ---------- Language pills ----------
    function initLangPills() {
        const saved = localStorage.getItem('lvbl_lang') || 'pt';
        document.querySelectorAll('.lang-pill').forEach((p) => {
            p.classList.toggle('active', p.dataset.lang === saved);
            p.addEventListener('click', () => {
                document.querySelectorAll('.lang-pill').forEach((x) => x.classList.remove('active'));
                p.classList.add('active');
                localStorage.setItem('lvbl_lang', p.dataset.lang);
            });
        });
    }

    // ---------- User card (nome + licença + timer) ----------
    const STORAGE_KEYS = {
        licenseInfo: 'lvbl_license_info',
        licenseKey: 'lvbl_license_key',
    };

    function fmtCountdown(ms) {
        if (ms <= 0) return '00:00';
        const totalMin = Math.floor(ms / 60000);
        const days = Math.floor(totalMin / (60 * 24));
        const hours = Math.floor((totalMin % (60 * 24)) / 60);
        const mins = totalMin % 60;
        const secs = Math.floor((ms % 60000) / 1000);
        if (days > 0) return `${days}d ${hours}h ${String(mins).padStart(2, '0')}m`;
        if (hours > 0) return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    let countdownIv = null;
    async function refreshUserCard() {
        try {
            const stored = await chrome.storage.local.get([STORAGE_KEYS.licenseInfo]);
            const info = stored[STORAGE_KEYS.licenseInfo];
            const userNameEl = document.querySelector('.user-name');
            const badgeEl = document.querySelector('.status-badge');
            const projEl = document.querySelector('.sync-project');
            const timerVal = document.querySelector('.timer-value');
            const timerFill = document.querySelector('.timer-bar-fill');
            const timerLabel = document.querySelector('.timer-label');

            // Nome do usuário
            if (info && userNameEl) {
                userNameEl.textContent =
                    info.customer_name || info.user_name || info.email || info.plan_name || 'User';
            }

            // Badge
            if (badgeEl) {
                const active = !!(info && info.status !== 'expired' && info.status !== 'revoked');
                badgeEl.textContent = active ? 'ATIVO' : 'INATIVO';
                badgeEl.style.filter = active ? '' : 'grayscale(1)';
            }

            // Project id
            if (projEl && window.state && window.state.projectId) {
                const pid = window.state.projectId;
                projEl.textContent = pid.length > 10 ? pid.slice(0, 8) + '…' : pid;
            }

            // Timer da licença: gerenciado exclusivamente por license.js
            // (updateCountdown). Antes havia dois setInterval(1s) escrevendo
            // no mesmo `.timer-value`, causando o efeito de piscar entre
            // dois contadores diferentes. Aqui só limpamos o estado vazio.
            if (countdownIv) {
                clearInterval(countdownIv);
                countdownIv = null;
            }
            const expIso = info && (info.expires_at || info.expiresAt);
            if (!expIso && timerVal) {
                timerVal.textContent = '—';
                if (timerFill) timerFill.style.width = '0%';
            }
        } catch (e) {
            console.warn('[ui-extras] user card refresh failed:', e);
        }
    }

    // ---------- Histórico ----------
    async function renderHistory() {
        const panel = document.querySelector('[data-panel="historico"]');
        if (!panel) return;

        const projectId = window.state && window.state.projectId;
        if (!projectId) return;

        const key = 'lvbl_chat_history_' + projectId;
        const data = await chrome.storage.local.get(key);
        const msgs = Array.isArray(data[key]) ? data[key] : [];

        const empty = panel.querySelector('.history-empty');
        let list = panel.querySelector('.history-list');
        if (!list) {
            list = document.createElement('div');
            list.className = 'history-list';
            panel.appendChild(list);
        }

        if (msgs.length === 0) {
            if (empty) empty.style.display = 'flex';
            list.innerHTML = '';
            return;
        }

        if (empty) empty.style.display = 'none';
        list.innerHTML = msgs
            .slice()
            .reverse()
            .map((m) => {
                const time = m.timestamp
                    ? new Date(m.timestamp).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                      })
                    : '';
                const roleClass = m.type === 'user' ? 'hist-user' : 'hist-agent';
                const label = m.type === 'user' ? 'Você' : 'Lovable';
                const content = (m.content || '').toString();
                const safe = content
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                return `
                    <div class="hist-item ${roleClass}">
                        <div class="hist-meta"><span class="hist-role">${label}</span><span class="hist-time">${time}</span></div>
                        <div class="hist-body">${safe}</div>
                    </div>`;
            })
            .join('');
    }

    // ---------- MODO PLANO (visual + preparação do prompt sem alterar envio) ----------
    function initModoPlano() {
        const cb = document.getElementById('modoPlano');
        if (!cb) return;
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendButton');
        const UI_KEY = 'lvbl_modo_plano_ui';
        const LEGACY_SEND_KEY = 'lvbl_modo_plano';
        const PLAN_PREFIX = 'MODO PLANEJAR ATIVADO: responda criando um plano claro e objetivo antes de qualquer implementação. Não execute alterações ainda; organize etapas, riscos e próximos passos.';

        const keepNormalSendPath = () => {
            try {
                // Mantém o envio no mesmo caminho normal da extensão, sem acionar
                // o antigo desvio chat_only que consumia créditos.
                localStorage.removeItem(LEGACY_SEND_KEY);
            } catch (_) {}
        };

        const alreadyPrepared = (text) => text.trim().startsWith(PLAN_PREFIX);

        const preparePlanPrompt = () => {
            if (!cb.checked || !input) return;
            keepNormalSendPath();
            const raw = input.value.trim();
            if (!raw || alreadyPrepared(raw)) return;
            input.value = `${PLAN_PREFIX}\n\nPedido do usuário:\n${raw}`;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        };

        const apply = (on) => {
            keepNormalSendPath();
            document.body.classList.toggle('plan-mode-on', on);
            if (input) {
                input.placeholder = on
                    ? 'Modo PLANEJAR ativo — envio normal da extensão...'
                    : 'Digite seu comando...';
            }
        };

        keepNormalSendPath();
        cb.checked = localStorage.getItem(UI_KEY) === '1';
        apply(cb.checked);
        cb.addEventListener('change', () => {
            localStorage.setItem(UI_KEY, cb.checked ? '1' : '0');
            apply(cb.checked);
        });

        if (sendBtn) sendBtn.addEventListener('click', preparePlanPrompt, true);
        if (input) {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) preparePlanPrompt();
            }, true);
        }
    }


    // ---------- Áudio: grava e injeta como anexo via fileInput (não altera send) ----------
    function initAudioButton() {
        // O 3º tool-btn no toolbar é o mic
        const buttons = document.querySelectorAll('.toolbar-actions .tool-btn');
        if (buttons.length < 3) return;
        const micBtn = buttons[2];
        const fileInputEl = document.getElementById('fileInput');
        if (!fileInputEl) return;

        let mediaRecorder = null;
        let chunks = [];
        let stream = null;

        async function start() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm';
                mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
                chunks = [];
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };
                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const fname = `audio-${Date.now()}.webm`;
                    const file = new File([blob], fname, { type: 'audio/webm' });
                    // Injeta no fileInput e dispara change para o popup.js processar
                    try {
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        fileInputEl.files = dt.files;
                        fileInputEl.dispatchEvent(new Event('change', { bubbles: true }));
                    } catch (err) {
                        console.warn('[ui-extras] falha ao anexar áudio:', err);
                    }
                    if (stream) stream.getTracks().forEach((t) => t.stop());
                    stream = null;
                    micBtn.classList.remove('recording');
                };
                mediaRecorder.start();
                micBtn.classList.add('recording');
                micBtn.title = 'Parar gravação';
            } catch (err) {
                console.warn('[ui-extras] mic error:', err);
                alert('Não foi possível acessar o microfone. Verifique as permissões da extensão.');
            }
        }

        function stop() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            micBtn.title = 'Áudio';
        }

        micBtn.addEventListener('click', () => {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') start();
            else stop();
        });
    }

    // ---------- Atalhos rápidos (prepara msg no textarea, não envia) ----------
    const SHORTCUT_PROMPTS = {
        bugs: 'Analise o código e identifique todos os bugs, erros e falhas. Corrija cada um deles explicando o problema e a solução aplicada.',
        refatorar: 'Elabore um plano completo de refatoração e otimização do sistema em etapas.',
        erros: 'Implemente tratamento de erros robusto em todo o código, incluindo try/catch, validações e mensagens de erro amigáveis para o usuário.',
        otimizar: 'Analise e otimize a performance do sistema, identificando gargalos, melhorando queries, reduzindo re-renders e aplicando boas práticas.',
        comentarios: 'Adicione comentários claros e documentação em todo o código, explicando a lógica, parâmetros e retornos de cada função.',
        seo: 'Monte um plano completo de criação e otimização de SEO para este site. Inclua: análise de meta tags (title, description, og:image), estrutura de headings (H1-H6), sitemap.xml, robots.txt, dados estruturados (JSON-LD), performance (Core Web Vitals), acessibilidade, URLs amigáveis, canonical tags, alt text em imagens, lazy loading, e estratégias de link building interno. Implemente todas as melhorias identificadas.',
        ui: 'Melhore a interface do usuário tornando-a mais moderna, responsiva e acessível, seguindo boas práticas de UX/UI.',
        componentes: 'Reorganize o código separando em componentes reutilizáveis, bem estruturados e com responsabilidades únicas.',
        review: 'Faça uma revisão completa do código identificando problemas de qualidade, segurança, performance e sugerindo melhorias.',
    };

    function initShortcuts() {
        const input = document.getElementById('messageInput');
        if (!input) return;
        const buttons = document.querySelectorAll('.shortcut-btn[data-shortcut]');
        let activeKey = null;

        function setActive(key) {
            buttons.forEach((b) => b.classList.toggle('active', b.dataset.shortcut === key));
        }

        buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.shortcut;
                const prompt = SHORTCUT_PROMPTS[key];
                if (!prompt) return;

                // Se clicar de novo no mesmo, desmarca e limpa
                if (activeKey === key) {
                    input.value = '';
                    activeKey = null;
                    setActive(null);
                } else {
                    // Substitui SEMPRE o conteúdo — apaga o atalho anterior
                    input.value = prompt;
                    activeKey = key;
                    setActive(key);
                }

                // Notifica popup.js (auto-resize, contadores etc.)
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.focus();
            });
        });

        // Se o usuário editar manualmente e o texto não bater com nenhum atalho, desmarca
        input.addEventListener('input', () => {
            if (activeKey && input.value !== SHORTCUT_PROMPTS[activeKey]) {
                activeKey = null;
                setActive(null);
            }
        });
    }

    // ---------- Remover Marca de Água (prefill + envio automático) ----------
    const WATERMARK_PROMPT =
        'use css para ocultar completamente o badge lovable (Made with Lovable)';


    function triggerExtensionSend(promptText) {
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendButton');
        if (!input || !sendBtn) return;
        input.value = promptText;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        // pequeno delay para o popup.js atualizar estado antes de disparar
        setTimeout(() => sendBtn.click(), 60);
    }

    // ---------- Baixar Código Fonte (via API git/files) ----------
    async function downloadSourceCode(btn) {
        const st = window.state || (typeof state !== 'undefined' ? state : null);
        if (!st || !st.projectId || !st.token) {
            alert('Abra a extensão em uma página de projeto do lovable.dev e faça login primeiro.');
            return;
        }
        if (typeof JSZip === 'undefined') {
            alert('Biblioteca JSZip não carregou. Recarregue a extensão.');
            return;
        }
        const orig = btn.textContent;
        const setLabel = (t) => { btn.textContent = t; };
        btn.disabled = true;
        try {
            const headers = {
                'Authorization': `Bearer ${st.token}`,
                'Accept': 'application/json',
                'Origin': 'https://lovable.dev',
                'Referer': 'https://lovable.dev/',
            };
            setLabel('Listando arquivos...');
            const listRes = await fetch(
                `https://api.lovable.dev/projects/${st.projectId}/git/files?ref=main`,
                { headers, credentials: 'include' }
            );
            if (!listRes.ok) {
                const t = await listRes.text().catch(() => '');
                throw new Error(`Falha ao listar arquivos (${listRes.status}) ${t.slice(0, 200)}`);
            }
            const data = await listRes.json();
            // Aceita formatos: [ ... ], {files:[ ... ]}, {data:{files:[...]}},
            // {tree:[ ... ]} — normaliza para array de {path}
            let rawList = Array.isArray(data) ? data
                : Array.isArray(data.files) ? data.files
                : Array.isArray(data.data?.files) ? data.data.files
                : Array.isArray(data.tree) ? data.tree
                : Array.isArray(data.entries) ? data.entries
                : [];
            const files = rawList
                .map((f) => {
                    if (typeof f === 'string') return { path: f, type: 'blob' };
                    const path = f.path || f.file_path || f.name || f.filename;
                    const type = f.type || f.kind || (f.mode === '040000' ? 'tree' : 'blob');
                    return path ? { path, type } : null;
                })
                .filter((f) => f && f.type !== 'tree' && f.type !== 'dir');
            if (!files.length) throw new Error('Nenhum arquivo retornado pelo projeto.');

            const zip = new JSZip();
            let done = 0;
            let idx = 0;
            const CONCURRENCY = 6;
            async function worker() {
                while (idx < files.length) {
                    const f = files[idx++];
                    const url = `https://api.lovable.dev/projects/${st.projectId}/git/file?path=${encodeURIComponent(f.path)}&ref=main`;
                    const r = await fetch(url, { headers, credentials: 'include' });
                    if (!r.ok) {
                        // pula arquivos que a API recuse (ex: LFS/binários grandes)
                        // em vez de abortar o zip inteiro
                        console.warn('[baixar-fonte] skip', f.path, r.status);
                        done++;
                        setLabel(`Baixando ${done}/${files.length}...`);
                        continue;
                    }
                    const ct = (r.headers.get('content-type') || '').toLowerCase();
                    let bytes;
                    if (ct.includes('application/json')) {
                        // resposta JSON estilo GitHub API: {content, encoding}
                        const j = await r.json();
                        const content = j.content ?? j.data?.content ?? j.text ?? '';
                        const enc = (j.encoding || j.data?.encoding || '').toLowerCase();
                        if (enc === 'base64' && typeof content === 'string') {
                            const bin = atob(content.replace(/\s+/g, ''));
                            const arr = new Uint8Array(bin.length);
                            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                            bytes = arr;
                        } else if (typeof content === 'string') {
                            bytes = new TextEncoder().encode(content);
                        } else {
                            bytes = new TextEncoder().encode(JSON.stringify(j));
                        }
                    } else {
                        bytes = new Uint8Array(await r.arrayBuffer());
                    }
                    zip.file(f.path, bytes);
                    done++;
                    setLabel(`Baixando ${done}/${files.length}...`);
                }
            }
            await Promise.all(
                Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker)
            );


            setLabel('Compactando .zip...');
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lovable-${st.projectId}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 8000);

            setLabel('✓ Baixado');
            setTimeout(() => { setLabel(orig); btn.disabled = false; }, 2500);
        } catch (err) {
            console.error('[baixar-fonte] failed', err);
            alert('Falha ao baixar código: ' + err.message);
            setLabel(orig);
            btn.disabled = false;
        }
    }

    function initActionButtons() {
        const buttons = document.querySelectorAll('.action-stack .action-btn');
        buttons.forEach((btn) => {
            const label = (btn.textContent || '').trim().toLowerCase();

            const setStandardChatButton = (on) => {
                btn.classList.toggle('is-active', !!on);
                btn.textContent = on ? 'Chat Padrão ATIVO ✓' : 'Usar Chat Padrão';
                btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            };

            const notifyStandardChatTabs = async (enabled) => {
                try {
                    const tabs = await chrome.tabs.query({ url: ['https://lovable.dev/*', 'https://*.lovable.dev/*'] });
                    await Promise.allSettled(tabs.map((tab) => {
                        if (!tab.id) return Promise.resolve();
                        return chrome.tabs.sendMessage(tab.id, { action: 'lvbl_standard_chat_set', enabled });
                    }));
                } catch (e) {
                    console.warn('[ui-extras] sync chat padrão tabs failed:', e);
                }
            };

            if (label.includes('marca')) {
                btn.addEventListener('click', () => {
                    if (!confirm('Enviar prompt para remover a marca d\'água do site?')) return;
                    triggerExtensionSend(WATERMARK_PROMPT);
                });
            }

            if (label.includes('baixar') || label.includes('fonte')) {
                btn.addEventListener('click', () => downloadSourceCode(btn));
            }




            if (label.includes('chat padr')) {
                btn.addEventListener('click', async () => {
                    try {
                        btn.disabled = true;
                        const cur = await chrome.storage.local.get(['lvbl_use_standard_chat']);
                        const active = cur.lvbl_use_standard_chat === false ? false : true;
                        const next = !active;
                        await chrome.storage.local.set({ lvbl_use_standard_chat: next });
                        setStandardChatButton(next);
                        await notifyStandardChatTabs(next);
                    } catch (e) {
                        console.warn('[ui-extras] toggle chat padrão failed:', e);
                    } finally {
                        btn.disabled = false;
                    }
                });

                // sincroniza estado inicial do botão
                chrome.storage.local.get(['lvbl_use_standard_chat'], (v) => {
                    const active = v.lvbl_use_standard_chat === false ? false : true;
                    setStandardChatButton(active);
                    notifyStandardChatTabs(active);
                });
            }

            if (label.includes('criar') && label.includes('projeto')) {
                btn.addEventListener('click', async () => {
                    const orig = btn.textContent;
                    btn.disabled = true;
                    btn.textContent = 'Criando…';
                    try {
                        const res = await chrome.runtime.sendMessage({ action: 'createNewProject' });
                        if (res && res.success) {
                            btn.textContent = '✓ Enviado à Lovable';
                        } else {
                            const msg = (res && res.error) || 'Falha ao criar projeto';
                            alert(msg);
                            btn.textContent = orig;
                        }
                    } catch (err) {
                        alert('Erro: ' + err.message);
                        btn.textContent = orig;
                    } finally {
                        setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2500);
                    }
                });
            }
        });
    }

    // ---------- Minimize (quando rodando dentro do painel flutuante) ----------
    function initMinimizeButton() {
        const btn = document.querySelector('.topbar .icon-btn[title="Minimizar"]');
        if (!btn) return;
        btn.addEventListener('click', () => {
            try {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ __lovableExt: 'minimize' }, '*');
                    return;
                }
            } catch (_) {}
            try { window.close(); } catch (_) {}
        });
    }

    const SUN_ICON = '<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/><circle cx="12" cy="12" r="5"/>';
    const MOON_ICON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    const THEME_KEY = 'lvbl_theme';

    function applyTheme(theme) {
        const light = theme === 'light';
        document.body.classList.toggle('theme-light', light);
        const icon = document.getElementById('themeIcon');
        if (icon) icon.innerHTML = light ? SUN_ICON : MOON_ICON;
    }

    function initThemeToggle() {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        let saved = 'dark';
        try { saved = localStorage.getItem(THEME_KEY) || 'dark'; } catch (_) {}
        applyTheme(saved);
        btn.addEventListener('click', () => {
            const next = document.body.classList.contains('theme-light') ? 'dark' : 'light';
            try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
            applyTheme(next);
        });
    }

    // ---------- Init ----------
    function init() {
        initTabs();
        initLangPills();
        initModoPlano();
        initAudioButton();
        initShortcuts();
        initActionButtons();
        initMinimizeButton();
        initThemeToggle();

        // User card / histórico dependem do state do popup.js e da licença
        const waitState = setInterval(() => {
            if (window.state && window.state.projectId) {
                clearInterval(waitState);
                refreshUserCard();
                // Re-render histórico se a aba estiver aberta
                const activeTab = document.querySelector('.tab.active');
                if (activeTab && activeTab.dataset.tab === 'historico') renderHistory();
            }
        }, 200);
        // Ainda atualiza o card se só a licença estiver disponível
        setTimeout(refreshUserCard, 500);
        setTimeout(refreshUserCard, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
