// Persistência de histórico do chat — NÃO toca em popup.js
// Salva state.messages por projeto em chrome.storage.local

(function () {
    const MAX_MESSAGES = 200; // guarda apenas as últimas N para não estourar quota
    const STORAGE_PREFIX = 'lvbl_chat_history_';

    function storageKey(projectId) {
        return STORAGE_PREFIX + (projectId || 'default');
    }

    // Remove data URLs pesados (preview base64) antes de salvar
    function slim(messages) {
        return messages.slice(-MAX_MESSAGES).map((m) => ({
            id: m.id,
            type: m.type,
            content: m.content,
            timestamp: m.timestamp,
            files: (m.files || []).map((f) => ({
                name: f.name,
                url: f.url,
                isImage: f.isImage,
                // preview omitido (data URL muito grande)
            })),
        }));
    }

    async function saveHistory() {
        if (!window.state || !window.state.projectId) return;
        try {
            await chrome.storage.local.set({
                [storageKey(window.state.projectId)]: slim(window.state.messages),
            });
        } catch (e) {
            console.warn('[history] save failed:', e);
        }
    }

    async function loadHistory(projectId) {
        try {
            const key = storageKey(projectId);
            const data = await chrome.storage.local.get(key);
            return Array.isArray(data[key]) ? data[key] : [];
        } catch (e) {
            console.warn('[history] load failed:', e);
            return [];
        }
    }

    // Aguarda popup.js expor `state` e definir projectId
    async function waitForState() {
        return new Promise((resolve) => {
            const start = Date.now();
            const iv = setInterval(() => {
                if (typeof state !== 'undefined' && state && state.projectId) {
                    clearInterval(iv);
                    // Expõe state no window para acesso consistente
                    window.state = state;
                    resolve(state);
                } else if (Date.now() - start > 15000) {
                    clearInterval(iv);
                    resolve(null);
                }
            }, 150);
        });
    }

    // Patch state.addMessage para salvar após cada mensagem
    function hookAddMessage(s) {
        const originalAdd = s.addMessage.bind(s);
        s.addMessage = function (...args) {
            const msg = originalAdd(...args);
            // salva async, sem bloquear
            saveHistory();
            return msg;
        };
    }

    async function init() {
        const s = await waitForState();
        if (!s) return;

        hookAddMessage(s);

        // Carrega histórico do projeto atual
        const saved = await loadHistory(s.projectId);
        if (saved.length > 0) {
            s.messages = saved.concat(s.messages);
            if (typeof renderMessages === 'function') {
                renderMessages();
            }
        }

        // Botão limpar histórico
        const clearBtn = document.getElementById('clearHistoryBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                if (!confirm('Limpar histórico deste projeto?')) return;
                s.messages = [];
                await chrome.storage.local.remove(storageKey(s.projectId));
                if (typeof renderMessages === 'function') renderMessages();
            });
        }
    }

    // Espera DOMContentLoaded (popup.js também espera) e depois inicializa
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
