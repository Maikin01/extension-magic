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

            // Timer da licença
            if (countdownIv) clearInterval(countdownIv);
            const expIso = info && (info.expires_at || info.expiresAt);
            if (expIso && timerVal && timerFill) {
                const exp = new Date(expIso).getTime();
                const createdIso = info.created_at || info.issued_at;
                const created = createdIso ? new Date(createdIso).getTime() : exp - 30 * 24 * 3600 * 1000;
                const total = Math.max(1, exp - created);

                const tick = () => {
                    const now = Date.now();
                    const left = exp - now;
                    timerVal.textContent = fmtCountdown(left);
                    const pct = Math.max(0, Math.min(100, (left / total) * 100));
                    timerFill.style.width = pct + '%';
                    if (left <= 0 && countdownIv) {
                        clearInterval(countdownIv);
                        timerVal.textContent = 'Expirada';
                    }
                };
                tick();
                countdownIv = setInterval(tick, 1000);
            } else if (timerVal && timerLabel) {
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

    function initActionButtons() {
        const buttons = document.querySelectorAll('.action-stack .action-btn');
        buttons.forEach((btn) => {
            const label = (btn.textContent || '').trim().toLowerCase();

            if (label.includes('marca')) {
                btn.addEventListener('click', () => {
                    if (!confirm('Enviar prompt para remover a marca d\'água do site?')) return;
                    triggerExtensionSend(WATERMARK_PROMPT);
                });
            }


            if (label.includes('chat padr')) {
                btn.addEventListener('click', async () => {
                    try {
                        const cur = await chrome.storage.local.get(['lvbl_use_standard_chat']);
                        const next = !cur.lvbl_use_standard_chat;
                        await chrome.storage.local.set({ lvbl_use_standard_chat: next });
                        btn.classList.toggle('is-active', next);
                        btn.textContent = next ? 'Chat Padrão ATIVO ✓' : 'Usar Chat Padrão';
                        if (next) {
                            alert(
                                'Chat Padrão ATIVO.\n\n' +
                                'Abra o chat do lovable.dev normalmente. Suas mensagens serão enviadas ' +
                                'pelo mesmo método da extensão (sem consumir créditos).\n\n' +
                                'Um aviso aparecerá no site a cada envio.'
                            );
                        }
                    } catch (e) {
                        console.warn('[ui-extras] toggle chat padrão failed:', e);
                    }
                });

                // sincroniza estado inicial do botão
                chrome.storage.local.get(['lvbl_use_standard_chat'], (v) => {
                    if (v.lvbl_use_standard_chat) {
                        btn.classList.add('is-active');
                        btn.textContent = 'Chat Padrão ATIVO ✓';
                    }
                });
            }
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
