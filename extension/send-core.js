// send-core.js — núcleo ÚNICO do envio da extensão.
// Roda em qualquer contexto (popup, content script isolado e mundo da página).
// Aqui fica o "truque" de envio: intent fix_error + contains_error + error_ids.
// Nenhum outro arquivo deve duplicar esse payload.
(function (global) {
    'use strict';
    if (global.__lvblSendCore) return;

    var FALLBACK_EVENT_ID = 'main:agent#00000000000123#bld:ZDP4ZE3D';
    var CHAT_ENDPOINT = 'https://api.lovable.dev/projects/{id}/chat';

    function randHex(n) {
        var a = new Uint8Array(n);
        (global.crypto || global.msCrypto).getRandomValues(a);
        return Array.prototype.map.call(a, function (b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
    }

    function randStr(n) {
        var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var s = '';
        for (var i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
        return s;
    }

    function messageIds() {
        var r = randHex(3);
        var r2 = randHex(2);
        return {
            userMessageId: 'umsg_01ktevtptd' + r2 + 's0d2' + r + 'x8cq70a' + randStr(4),
            aiMessageId: 'aimsg_01ktevtpvh' + r + '7n2rj62vz7',
        };
    }

    // Aplica o truque em QUALQUER payload de chat já montado.
    function applyFreeTrick(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        obj.intent = 'fix_error';
        obj.contains_error = true;
        obj.error_ids = [FALLBACK_EVENT_ID];
        obj.message_intent_metadata = {
            fix_error_metadata: {
                errors: [{
                    error_type: 'build',
                    error_message: '',
                    build_event_id: FALLBACK_EVENT_ID,
                }],
            },
        };
        return obj;
    }

    // Remove o truque (modo plano precisa de chat_only real).
    function applyPlanMode(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        obj.chat_only = true;
        obj.contains_error = false;
        obj.error_ids = [];
        delete obj.intent;
        delete obj.error_source;
        delete obj.message_intent_metadata;
        return obj;
    }

    function buildBody(message, options) {
        var opts = options || {};
        var ids = messageIds();
        var w = opts.viewportWidth || (global.innerWidth || 1465);
        var h = opts.viewportHeight || (global.innerHeight || 408);
        var body = {
            id: ids.userMessageId,
            message: message,
            files: opts.files || [],
            selected_elements: [],
            chat_only: false,
            optimisticImageUrls: opts.optimisticImageUrls || [],
            ai_message_id: ids.aiMessageId,
            thread_id: 'main',
            current_page: opts.currentPage || '/',
            current_viewport_width: w,
            current_viewport_height: h,
            current_viewport_dpr: opts.dpr || global.devicePixelRatio || 1,
            view: 'preview',
            view_description: 'The user is currently viewing the preview.',
            model: null,
            network_requests: [],
            runtime_errors: [],
            integration_metadata: {
                browser: {
                    preview_viewport_width: w,
                    preview_viewport_height: h,
                    is_logged_out: false,
                },
            },
        };
        applyFreeTrick(body);
        if (opts.planMode) applyPlanMode(body);
        return body;
    }

    function chatUrl(projectId) {
        return CHAT_ENDPOINT.replace('{id}', projectId);
    }

    function describeFailure(status, text) {
        var snippet = (text || '').slice(0, 200);
        if (status === 401 || status === 403) {
            return 'Sessão do Lovable expirada ou sem permissão (HTTP ' + status + '). Abra lovable.dev, faça login e tente de novo.';
        }
        if (status === 404) return 'Projeto não encontrado no Lovable (HTTP 404).';
        if (status === 429) return 'Muitas requisições no Lovable (HTTP 429). Aguarde alguns segundos.';
        if (status >= 500) return 'Lovable fora do ar no momento (HTTP ' + status + ').';
        return 'Falha no envio (HTTP ' + status + ')' + (snippet ? ': ' + snippet : '');
    }

    global.__lvblSendCore = {
        FALLBACK_EVENT_ID: FALLBACK_EVENT_ID,
        messageIds: messageIds,
        buildBody: buildBody,
        applyFreeTrick: applyFreeTrick,
        applyPlanMode: applyPlanMode,
        chatUrl: chatUrl,
        describeFailure: describeFailure,
    };
})(typeof window !== 'undefined' ? window : self);
