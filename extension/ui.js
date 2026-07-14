// UI-only interactions (não toca em lógica de envio)
(function () {
    function storageGet(keys) {
        return new Promise((resolve) => {
            try {
                const maybePromise = chrome.storage.local.get(keys, (result) => resolve(result || {}));
                if (maybePromise && typeof maybePromise.then === 'function') {
                    maybePromise.then((result) => resolve(result || {})).catch(() => resolve({}));
                }
            } catch {
                resolve({});
            }
        });
    }

    function storageSet(value) {
        return new Promise((resolve) => {
            try {
                const maybePromise = chrome.storage.local.set(value, () => resolve());
                if (maybePromise && typeof maybePromise.then === 'function') {
                    maybePromise.then(resolve).catch(resolve);
                }
            } catch {
                resolve();
            }
        });
    }

    // ===== Tabs =====
    const tabs = document.querySelectorAll('.tab');
    const panels = {
        prompt: document.getElementById('tab-prompt'),
        history: document.getElementById('tab-history'),
    };
    tabs.forEach((t) => {
        t.addEventListener('click', () => {
            tabs.forEach((x) => x.classList.remove('active'));
            t.classList.add('active');
            const target = t.dataset.tab;
            Object.entries(panels).forEach(([k, el]) => {
                if (!el) return;
                el.hidden = k !== target;
            });
            if (target === 'history') renderHistory();
        });
    });

    // ===== Language switch (visual only) =====
    document.querySelectorAll('.lang').forEach((b) => {
        b.addEventListener('click', () => {
            document.querySelectorAll('.lang').forEach((x) => x.classList.remove('active'));
            b.classList.add('active');
        });
    });

    // ===== Theme toggle =====
    const themeBtn = document.getElementById('themeToggle');
    storageGet('lvbl_theme').then((r) => {
        if (r.lvbl_theme === 'light') {
            document.body.classList.add('light');
            if (themeBtn) themeBtn.textContent = '☀️';
        }
    });
    themeBtn?.addEventListener('click', async () => {
        document.body.classList.toggle('light');
        const isLight = document.body.classList.contains('light');
        themeBtn.textContent = isLight ? '☀️' : '🌙';
        await storageSet({ lvbl_theme: isLight ? 'light' : 'dark' });
    });

    // ===== Shortcut prompts =====
    const input = document.getElementById('messageInput');
    document.querySelectorAll('[data-prompt]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const text = btn.dataset.prompt;
            if (!input) return;
            input.value = text;
            input.focus();
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });

    // ===== Download source (placeholder) =====
    document.getElementById('downloadBtn')?.addEventListener('click', () => {
        alert('Download do código fonte estará disponível em breve.');
    });
    document.getElementById('newProjectBtn')?.addEventListener('click', () => {
        window.open('https://lovable.dev/', '_blank');
    });
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
        alert('Configurações em breve.');
    });
    document.getElementById('micBtn')?.addEventListener('click', () => {
        alert('Envio por áudio em breve.');
    });

    // ===== License expiry countdown =====
    const infoText = document.getElementById('licenseInfoText');
    const barFill = document.querySelector('.lic-bar-fill');
    async function updateTimer() {
        try {
            const r = await chrome.storage.local.get('lvbl_license_info');
            const info = r.lvbl_license_info;
            if (!info || !info.expires_at) return;
            const end = new Date(info.expires_at).getTime();
            const now = Date.now();
            const diff = Math.max(0, end - now);
            const days = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            let display;
            if (days > 0) display = `${days}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            else display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            if (infoText) infoText.textContent = display;
            if (barFill) {
                // barra decai nos últimos 30 dias
                const pct = Math.min(100, Math.max(5, (diff / (30 * 86400000)) * 100));
                barFill.style.width = pct + '%';
            }
        } catch {}
    }
    updateTimer();
    setInterval(updateTimer, 1000);

    // ===== History tab render =====
    function renderHistory() {
        const list = document.getElementById('historyList');
        const empty = document.getElementById('historyEmpty');
        if (!list || !empty) return;
        const msgs = (window.state && Array.isArray(window.state.messages))
            ? window.state.messages.filter((m) => m.type === 'user')
            : [];
        if (msgs.length === 0) {
            empty.style.display = 'flex';
            list.innerHTML = '';
            return;
        }
        empty.style.display = 'none';
        list.innerHTML = msgs.slice().reverse().map((m) => {
            const t = new Date(m.timestamp || Date.now()).toLocaleString('pt-BR');
            const content = (m.content || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
            return `<div class="history-item">${content}<div class="h-time">${t}</div></div>`;
        }).join('');
    }

    // Expor projectId formatado curto
    const projectEl = document.getElementById('projectId');
    if (projectEl) {
        const obs = new MutationObserver(() => {
            const txt = projectEl.textContent || '';
            const match = txt.match(/Projeto:\s*([a-z0-9-]+)/i);
            if (match) {
                const short = match[1].slice(0, 8) + '...';
                projectEl.textContent = `✅ Sincronizado! Projeto: ${short}`;
            }
        });
        obs.observe(projectEl, { childList: true, characterData: true, subtree: true });
    }
})();
