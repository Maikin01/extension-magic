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
});

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