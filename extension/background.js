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
});

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