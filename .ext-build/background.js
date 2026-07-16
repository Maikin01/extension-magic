// Background service worker
chrome.runtime.onInstalled.addListener(() => {
    console.log('Lovable Chat Extension installed');
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCookies') {
        chrome.cookies.getAll({
            domain: 'lovable.dev'
        }, (cookies) => {
            sendResponse({ cookies: cookies });
        });
        return true; // Keep the message channel open
    }
    
    if (request.action === 'uploadToStorage') {
        // Handle storage upload in background to avoid CORS
        handleStorageUpload(request.data)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open
    }

    if (request.action === 'createNewProject') {
        createNewProject()
            .then((r) => sendResponse({ success: true, ...r }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === 'sendStandardChat') {
        sendStandardChat(request.projectId, request.body)
            .then((r) => sendResponse({ success: true, ...r }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        return true;
    }
});

async function sendStandardChat(projectId, body) {
    if (!projectId) throw new Error('projectId ausente');
    const cookies = await chrome.cookies.getAll({ domain: 'lovable.dev' });
    if (!cookies.length) throw new Error('Cookies não encontrados. Faça login no Lovable.dev.');
    const sessionCookie = cookies.find((c) =>
        c.name === 'lovable-session-id-v2' || c.name.includes('session') || c.name === 'sb-access-token'
    );
    if (!sessionCookie) throw new Error('Token de sessão não encontrado.');
    const token = sessionCookie.value;
    const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const res = await fetch(`https://api.lovable.dev/projects/${projectId}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Origin': 'https://lovable.dev',
            'Referer': 'https://lovable.dev/',
            'Cookie': cookieString,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(body)
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    return { status: res.status, body: text };
}

async function findOrOpenDashboardTab() {
    const tabs = await chrome.tabs.query({ url: ['https://lovable.dev/*', 'https://*.lovable.dev/*'] });
    // Always target the initial Lovable screen. Other non-project pages can
    // contain buttons like "Share Lovable", so do not run the create flow there.
    let tab = tabs.find((t) => {
        if (!t.url || /\/projects\//.test(t.url)) return false;
        try {
            const url = new URL(t.url);
            return url.hostname.endsWith('lovable.dev') && (url.pathname === '/' || url.pathname === '');
        } catch (_) {
            return false;
        }
    });
    if (tab) {
        await chrome.tabs.update(tab.id, { active: true });
        try { await chrome.windows.update(tab.windowId, { focused: true }); } catch (_) {}
        return tab;
    }
    tab = tabs.find((t) => t.url && !/\/projects\//.test(t.url));
    if (tab) {
        await chrome.tabs.update(tab.id, { url: 'https://lovable.dev/', active: true });
        try { await chrome.windows.update(tab.windowId, { focused: true }); } catch (_) {}
        await new Promise((resolve) => {
            const listener = (tabId, info) => {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
            setTimeout(resolve, 8000);
        });
        return tab;
    }
    tab = await chrome.tabs.create({ url: 'https://lovable.dev/', active: true });
    // Wait for load complete
    await new Promise((resolve) => {
        const listener = (tabId, info) => {
            if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
        setTimeout(resolve, 8000);
    });
    return tab;
}

async function createNewProject() {
    const tab = await findOrOpenDashboardTab();
    // Give content script a moment if the tab was just created
    await new Promise((r) => setTimeout(r, 400));
    for (let i = 0; i < 20; i++) {
        try {
            const res = await chrome.tabs.sendMessage(tab.id, { action: 'lvbl_create_new_project' });
            if (res && res.ok) return { tabId: tab.id };
            if (res && res.error) throw new Error(res.error);
        } catch (e) {
            // content script may not be ready yet
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('Não foi possível acionar o chat da dashboard. Recarregue a página lovable.dev e tente novamente.');
}

async function handleStorageUpload(data) {
    const { url, headers, body, fileId } = data;
    
    try {
        // Converter ArrayBuffer de volta para poder enviar
        const response = await fetch(url, {
            method: 'PUT',
            headers: headers,
            body: new Uint8Array(body)
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }
        
        return { status: response.status };
    } catch (error) {
        throw error;
    }
}