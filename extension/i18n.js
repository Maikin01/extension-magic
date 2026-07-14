// i18n: PT (padrão) | EN | ES
export const I18N = {
  pt: {
    'loading': 'Verificando licença…',
    'license.title': 'Insira sua licença',
    'license.desc': 'Cole a chave que aparece no seu painel.',
    'license.validate': 'Validar Licença',
    'license.buy': '🛒 Comprar Licença',
    'status.active': 'ATIVO',
    'sync.ok': 'Sincronizado!',
    'tab.prompt': 'Prompt',
    'tab.history': 'Histórico',
    'prompt.placeholder': 'Digite seu comando...',
    'toggle.plan': 'Plano',
    'btn.attach': 'Anexar arquivo',
    'btn.optimize': 'Otimizar com IA',
    'btn.mic': 'Voz para texto',
    'btn.send': 'Enviar',
    'shortcuts.title': 'ATALHOS RÁPIDOS',
    'history.empty.title': 'Nenhuma mensagem ainda',
    'history.empty.desc': 'Seus prompts enviados aparecerão aqui.',
    'history.clear': 'Limpar histórico',
    'history.count': (n) => `${n} ${n === 1 ? 'mensagem' : 'mensagens'}`,
    'footer.support': 'Suporte',
    'blocked.retry': 'Colar outra chave',
    'countdown.expires': 'Licença expira em',
    'toast.copied': '✅ Prompt copiado — cole no Lovable',
    'toast.empty': 'Digite algo primeiro',
    'toast.sent': '✅ Enviado ao Lovable',
    'toast.notLovable': 'Abra o Lovable primeiro',
    'chat.sent': 'enviado',
    // shortcuts
    'sc.bugs': 'Bugs',
    'sc.refactor': 'Refatorar',
    'sc.errors': 'Erros',
    'sc.optimize': 'Otimizar',
    'sc.comments': 'Comentários',
    'sc.seo': 'SEO',
    'sc.ui': 'UI',
    'sc.components': 'Componentes',
    'sc.review': 'Review',
    'sc.bugs.prompt': 'Analise o código atual, identifique bugs e corrija-os mantendo o estilo existente.',
    'sc.refactor.prompt': 'Refatore o código para melhorar legibilidade e organização, sem mudar o comportamento.',
    'sc.errors.prompt': 'Verifique erros de runtime e de tipo. Corrija tudo garantindo build limpo.',
    'sc.optimize.prompt': 'Otimize performance, reduza re-renders e melhore o tempo de carregamento.',
    'sc.comments.prompt': 'Adicione comentários claros nas partes complexas do código.',
    'sc.seo.prompt': 'Melhore SEO: title, meta description, headings, alt em imagens e dados estruturados.',
    'sc.ui.prompt': 'Melhore a UI mantendo a identidade visual atual — mais polida, moderna e consistente.',
    'sc.components.prompt': 'Divida arquivos grandes em componentes menores e reutilizáveis.',
    'sc.review.prompt': 'Faça um code review completo: arquitetura, segurança, boas práticas e sugestões.',
    // errors
    'err.not_found': 'Chave não encontrada. Confira se copiou corretamente.',
    'err.expired': 'Licença expirada. Renove seu plano.',
    'err.revoked': 'Licença revogada. Fale com o suporte.',
    'err.suspended': 'Licença suspensa temporariamente.',
    'err.device_limit': 'Limite de dispositivos atingido.',
    'err.device_mismatch': 'Dispositivo não autorizado.',
    'err.invalid_payload': 'Formato inválido. Use LVBL-XXXX-XXXX-XXXX-XXXX.',
    'err.error': 'Erro no servidor. Tente novamente.',
    'err.empty_key': 'Cole a chave primeiro.',
  },
  en: {
    'loading': 'Checking license…',
    'license.title': 'Enter your license',
    'license.desc': 'Paste the key from your dashboard.',
    'license.validate': 'Validate License',
    'license.buy': '🛒 Buy License',
    'status.active': 'ACTIVE',
    'sync.ok': 'Synced!',
    'tab.prompt': 'Prompt',
    'tab.history': 'History',
    'prompt.placeholder': 'Type your command...',
    'toggle.plan': 'Plan',
    'btn.attach': 'Attach file',
    'btn.optimize': 'Optimize with AI',
    'btn.mic': 'Voice to text',
    'btn.send': 'Send',
    'shortcuts.title': 'QUICK SHORTCUTS',
    'history.empty.title': 'No messages yet',
    'history.empty.desc': 'Your sent prompts will appear here.',
    'history.clear': 'Clear history',
    'history.count': (n) => `${n} ${n === 1 ? 'message' : 'messages'}`,
    'footer.support': 'Support',
    'blocked.retry': 'Try another key',
    'countdown.expires': 'License expires in',
    'toast.copied': '✅ Prompt copied — paste in Lovable',
    'toast.empty': 'Type something first',
    'toast.sent': '✅ Sent to Lovable',
    'toast.notLovable': 'Open Lovable first',
    'chat.sent': 'sent',
    'sc.bugs': 'Bugs',
    'sc.refactor': 'Refactor',
    'sc.errors': 'Errors',
    'sc.optimize': 'Optimize',
    'sc.comments': 'Comments',
    'sc.seo': 'SEO',
    'sc.ui': 'UI',
    'sc.components': 'Components',
    'sc.review': 'Review',
    'sc.bugs.prompt': 'Analyze the current code, find bugs and fix them keeping the existing style.',
    'sc.refactor.prompt': 'Refactor the code to improve readability and organization without changing behavior.',
    'sc.errors.prompt': 'Check runtime and type errors. Fix everything ensuring a clean build.',
    'sc.optimize.prompt': 'Optimize performance, reduce re-renders and improve load time.',
    'sc.comments.prompt': 'Add clear comments to the complex parts of the code.',
    'sc.seo.prompt': 'Improve SEO: title, meta description, headings, image alt and structured data.',
    'sc.ui.prompt': 'Improve the UI keeping the current visual identity — more polished, modern and consistent.',
    'sc.components.prompt': 'Split large files into smaller reusable components.',
    'sc.review.prompt': 'Do a full code review: architecture, security, best practices and suggestions.',
    'err.not_found': 'Key not found. Check that you copied correctly.',
    'err.expired': 'License expired. Renew your plan.',
    'err.revoked': 'License revoked. Contact support.',
    'err.suspended': 'License temporarily suspended.',
    'err.device_limit': 'Device limit reached.',
    'err.device_mismatch': 'Device not authorized.',
    'err.invalid_payload': 'Invalid format. Use LVBL-XXXX-XXXX-XXXX-XXXX.',
    'err.error': 'Server error. Try again.',
    'err.empty_key': 'Paste the key first.',
  },
  es: {
    'loading': 'Verificando licencia…',
    'license.title': 'Introduce tu licencia',
    'license.desc': 'Pega la clave de tu panel.',
    'license.validate': 'Validar Licencia',
    'license.buy': '🛒 Comprar Licencia',
    'status.active': 'ACTIVO',
    'sync.ok': '¡Sincronizado!',
    'tab.prompt': 'Prompt',
    'tab.history': 'Historial',
    'prompt.placeholder': 'Escribe tu comando...',
    'toggle.plan': 'Plan',
    'btn.attach': 'Adjuntar archivo',
    'btn.optimize': 'Optimizar con IA',
    'btn.mic': 'Voz a texto',
    'btn.send': 'Enviar',
    'shortcuts.title': 'ATAJOS RÁPIDOS',
    'history.empty.title': 'Aún no hay mensajes',
    'history.empty.desc': 'Tus prompts enviados aparecerán aquí.',
    'history.clear': 'Limpiar historial',
    'history.count': (n) => `${n} ${n === 1 ? 'mensaje' : 'mensajes'}`,
    'footer.support': 'Soporte',
    'blocked.retry': 'Probar otra clave',
    'countdown.expires': 'La licencia expira en',
    'toast.copied': '✅ Prompt copiado — pégalo en Lovable',
    'toast.empty': 'Escribe algo primero',
    'toast.sent': '✅ Enviado a Lovable',
    'toast.notLovable': 'Abre Lovable primero',
    'chat.sent': 'enviado',
    'sc.bugs': 'Bugs',
    'sc.refactor': 'Refactorizar',
    'sc.errors': 'Errores',
    'sc.optimize': 'Optimizar',
    'sc.comments': 'Comentarios',
    'sc.seo': 'SEO',
    'sc.ui': 'UI',
    'sc.components': 'Componentes',
    'sc.review': 'Review',
    'sc.bugs.prompt': 'Analiza el código actual, encuentra bugs y arréglalos manteniendo el estilo existente.',
    'sc.refactor.prompt': 'Refactoriza el código para mejorar la legibilidad y organización sin cambiar el comportamiento.',
    'sc.errors.prompt': 'Verifica errores de runtime y de tipo. Arregla todo asegurando un build limpio.',
    'sc.optimize.prompt': 'Optimiza el rendimiento, reduce re-renders y mejora el tiempo de carga.',
    'sc.comments.prompt': 'Añade comentarios claros a las partes complejas del código.',
    'sc.seo.prompt': 'Mejora el SEO: title, meta description, headings, alt en imágenes y datos estructurados.',
    'sc.ui.prompt': 'Mejora la UI manteniendo la identidad visual actual — más pulida, moderna y consistente.',
    'sc.components.prompt': 'Divide archivos grandes en componentes más pequeños y reutilizables.',
    'sc.review.prompt': 'Haz un code review completo: arquitectura, seguridad, buenas prácticas y sugerencias.',
    'err.not_found': 'Clave no encontrada. Verifica que la copiaste correctamente.',
    'err.expired': 'Licencia expirada. Renueva tu plan.',
    'err.revoked': 'Licencia revocada. Contacta al soporte.',
    'err.suspended': 'Licencia suspendida temporalmente.',
    'err.device_limit': 'Límite de dispositivos alcanzado.',
    'err.device_mismatch': 'Dispositivo no autorizado.',
    'err.invalid_payload': 'Formato inválido. Usa LVBL-XXXX-XXXX-XXXX-XXXX.',
    'err.error': 'Error del servidor. Intenta de nuevo.',
    'err.empty_key': 'Pega la clave primero.',
  },
};

let _lang = 'pt';

export function setLang(lang) {
  if (['pt', 'en', 'es'].includes(lang)) {
    _lang = lang;
    try { localStorage.setItem('lv_lang', lang); } catch (e) {}
  }
}

export function getLang() { return _lang; }

export function loadLang() {
  try {
    const s = localStorage.getItem('lv_lang');
    if (s && ['pt', 'en', 'es'].includes(s)) _lang = s;
  } catch (e) {}
  return _lang;
}

export function t(key, ...args) {
  const dict = I18N[_lang] || I18N.pt;
  const val = dict[key] ?? I18N.pt[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (typeof val === 'string') el.textContent = val;
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (typeof val === 'string') el.title = val;
  });
  const ph = root.querySelector('#promptText');
  if (ph) ph.placeholder = t('prompt.placeholder');
}
