// content-panel.js — injeta o popup da extensão como painel flutuante arrastável
// nas páginas do Lovable, com botão minimizar que colapsa para uma bolha.
// Não altera nenhuma lógica de envio, cookies ou auth.

(function () {
    'use strict';

    if (window.__lovableExtPanelInjected) return;
    window.__lovableExtPanelInjected = true;

    const PANEL_W = 420;
    const PANEL_H = 640;
    const BUBBLE_SIZE = 56;
    const STORAGE_KEY = 'lvbl_panel_state_v1';

    const popupUrl = chrome.runtime.getURL('popup.html');
    const logoUrl = chrome.runtime.getURL('icons/throne-mascot.png');
    const iconFallback = chrome.runtime.getURL('icons/icon48.png');

    // ---------- State ----------
    const defaultState = {
        minimized: true,
        panel: { x: null, y: null },
        bubble: { x: null, y: null },
    };
    let state = { ...defaultState };

    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

    function loadState(cb) {
        try {
            chrome.storage.local.get([STORAGE_KEY], (res) => {
                const saved = res && res[STORAGE_KEY];
                if (saved && typeof saved === 'object') {
                    state = { ...defaultState, ...saved,
                        panel: { ...defaultState.panel, ...(saved.panel || {}) },
                        bubble: { ...defaultState.bubble, ...(saved.bubble || {}) } };
                }
                cb();
            });
        } catch (_) { cb(); }
    }
    function saveState() {
        try { chrome.storage.local.set({ [STORAGE_KEY]: state }); } catch (_) {}
    }

    // ---------- Styles ----------
    const style = document.createElement('style');
    style.textContent = `
    #lovable-ext-panel, #lovable-ext-bubble {
        position: fixed;
        z-index: 2147483646;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #lovable-ext-panel {
        width: ${PANEL_W}px;
        height: ${PANEL_H + 32}px;
        background: #000;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(255,60,60,.18);
        overflow: hidden;
        display: none;
        flex-direction: column;
    }
    #lovable-ext-panel.visible { display: flex; }
    #lovable-ext-dragbar {
        height: 32px;
        background: linear-gradient(180deg, #1a0d11, #0a0608);
        border-bottom: 1px solid rgba(255,60,60,.18);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        cursor: grab;
        touch-action: none;
        user-select: none;
        user-select: none;
        color: #f4eff0;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: .3px;
    }
    #lovable-ext-dragbar.dragging { cursor: grabbing; }
    #lovable-ext-dragbar .lb-title {
        display: flex; align-items: center; gap: 8px;
    }
    #lovable-ext-dragbar .lb-title img { width: 18px; height: 18px; border-radius: 50%; }
    #lovable-ext-dragbar .lb-actions { display: flex; gap: 4px; }
    #lovable-ext-dragbar button {
        background: transparent;
        border: 1px solid rgba(255,60,60,.2);
        color: #f4eff0;
        width: 22px; height: 22px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        display: flex; align-items: center; justify-content: center;
        padding: 0;
    }
    #lovable-ext-dragbar button:hover { background: rgba(255,60,60,.15); }
    #lovable-ext-panel iframe {
        flex: 1;
        border: 0;
        width: 100%;
        display: block;
        background: #000;
    }
    #lovable-ext-bubble {
        width: ${BUBBLE_SIZE}px;
        height: ${BUBBLE_SIZE}px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #2a171c, #0a0608);
        box-shadow: 0 8px 24px rgba(0,0,0,.5), 0 0 0 2px rgba(255,40,40,.35);
        cursor: grab;
        display: none;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        user-select: none;
    }
    #lovable-ext-bubble.visible { display: flex; }
    #lovable-ext-bubble.dragging { cursor: grabbing; }
    #lovable-ext-bubble img {
        width: 70%; height: 70%; object-fit: contain;
        pointer-events: none;
    }
    #lovable-ext-bubble:hover { box-shadow: 0 10px 30px rgba(0,0,0,.6), 0 0 0 2px rgba(255,60,60,.6); }
    `;
    document.documentElement.appendChild(style);

    // ---------- DOM ----------
    const panel = document.createElement('div');
    panel.id = 'lovable-ext-panel';
    panel.innerHTML = `
        <div id="lovable-ext-dragbar">
            <div class="lb-title">
                <img src="${logoUrl}" onerror="this.src='${iconFallback}'" alt="" />
                <span>Lovable Chat</span>
            </div>
            <div class="lb-actions">
                <button id="lovable-ext-min" title="Minimizar" aria-label="Minimizar">—</button>
            </div>
        </div>
        <iframe id="lovable-ext-frame" src="${popupUrl}" allow="clipboard-read; clipboard-write"></iframe>
    `;

    const bubble = document.createElement('div');
    bubble.id = 'lovable-ext-bubble';
    bubble.title = 'Abrir Lovable Chat';
    bubble.innerHTML = `<img src="${logoUrl}" onerror="this.src='${iconFallback}'" alt="Lovable Chat" />`;

    // ---------- Positioning ----------
    function applyPanelPos() {
        const maxX = window.innerWidth - PANEL_W - 8;
        const maxY = window.innerHeight - (PANEL_H + 32) - 8;
        let x = state.panel.x, y = state.panel.y;
        if (x == null || y == null) {
            x = Math.max(8, window.innerWidth - PANEL_W - 24);
            y = 80;
        }
        panel.style.left = clamp(x, 8, Math.max(8, maxX)) + 'px';
        panel.style.top = clamp(y, 8, Math.max(8, maxY)) + 'px';
    }
    function applyBubblePos() {
        const maxX = window.innerWidth - BUBBLE_SIZE - 8;
        const maxY = window.innerHeight - BUBBLE_SIZE - 8;
        let x = state.bubble.x, y = state.bubble.y;
        if (x == null || y == null) {
            x = window.innerWidth - BUBBLE_SIZE - 24;
            y = window.innerHeight - BUBBLE_SIZE - 100;
        }
        bubble.style.left = clamp(x, 8, Math.max(8, maxX)) + 'px';
        bubble.style.top = clamp(y, 8, Math.max(8, maxY)) + 'px';
    }

    function render() {
        panel.classList.toggle('visible', !state.minimized);
        bubble.classList.toggle('visible', state.minimized);
        applyPanelPos();
        applyBubblePos();
    }

    function minimize() {
        state.minimized = true; saveState(); render();
    }
    function expand() {
        state.minimized = false; saveState(); render();
    }

    // ---------- Dragging (pointer events + rAF + pointer capture) ----------
    function makeDraggable(el, handle, kind) {
        let dragging = false, pointerId = null;
        let startX = 0, startY = 0, origX = 0, origY = 0;
        let curX = 0, curY = 0, moved = false, rafId = 0;

        const iframe = el.querySelector('iframe');

        function onFrame() {
            rafId = 0;
            if (!dragging) return;
            const w = el.offsetWidth, h = el.offsetHeight;
            const nx = clamp(origX + (curX - startX), 4, window.innerWidth - w - 4);
            const ny = clamp(origY + (curY - startY), 4, window.innerHeight - h - 4);
            el.style.left = nx + 'px';
            el.style.top = ny + 'px';
        }

        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            if (e.target.closest('button')) return;
            dragging = true; moved = false; pointerId = e.pointerId;
            startX = curX = e.clientX; startY = curY = e.clientY;
            const rect = el.getBoundingClientRect();
            origX = rect.left; origY = rect.top;
            handle.classList.add('dragging');
            el.classList.add('dragging');
            // block iframe from stealing pointer events during panel drag
            if (iframe) iframe.style.pointerEvents = 'none';
            try { handle.setPointerCapture(pointerId); } catch (_) {}
            e.preventDefault();
        });

        handle.addEventListener('pointermove', (e) => {
            if (!dragging || e.pointerId !== pointerId) return;
            curX = e.clientX; curY = e.clientY;
            if (Math.abs(curX - startX) + Math.abs(curY - startY) > 3) moved = true;
            if (!rafId) rafId = requestAnimationFrame(onFrame);
        });

        function endDrag(e) {
            if (!dragging || (e && e.pointerId !== pointerId)) return;
            dragging = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
            handle.classList.remove('dragging');
            el.classList.remove('dragging');
            if (iframe) iframe.style.pointerEvents = '';
            try { handle.releasePointerCapture(pointerId); } catch (_) {}
            const rect = el.getBoundingClientRect();
            state[kind] = { x: rect.left, y: rect.top };
            saveState();
            if (kind === 'bubble' && !moved) {
                const br = bubble.getBoundingClientRect();
                const panelH = PANEL_H + 32;
                let px = br.left;
                let py = br.top;
                if (px + PANEL_W + 8 > window.innerWidth) px = br.right - PANEL_W;
                if (py + panelH + 8 > window.innerHeight) py = br.bottom - panelH;
                px = clamp(px, 8, Math.max(8, window.innerWidth - PANEL_W - 8));
                py = clamp(py, 8, Math.max(8, window.innerHeight - panelH - 8));
                state.panel = { x: px, y: py };
                saveState();
                expand();
            }
        }
        handle.addEventListener('pointerup', endDrag);
        handle.addEventListener('pointercancel', endDrag);
    }

    // ---------- Init ----------
    function init() {
        document.body.appendChild(panel);
        document.body.appendChild(bubble);

        document.getElementById('lovable-ext-min').addEventListener('click', (e) => {
            e.stopPropagation();
            minimize();
        });

        makeDraggable(panel, document.getElementById('lovable-ext-dragbar'), 'panel');
        makeDraggable(bubble, bubble, 'bubble');

        // Minimize requests coming from inside the iframe
        window.addEventListener('message', (ev) => {
            if (!ev.data || typeof ev.data !== 'object') return;
            if (ev.data.__lovableExt === 'minimize') minimize();
            if (ev.data.__lovableExt === 'expand') expand();
        });

        window.addEventListener('resize', render);
        render();
    }

    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
