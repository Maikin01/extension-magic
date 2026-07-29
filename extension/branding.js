// Branding dinâmico da extensão. Aplicado quando a licença retorna um
// `branding_code` associado a um revendedor. Sem código = marca padrão.

const BRANDS = {
    default: {
        firstLine: 'Rise',
        secondLine: 'Lovable',
        title: 'Rise Lovable',
        logoSrc: 'icons/logo.png',
    },
};

const BRAND_STORAGE_KEY = 'lvbl_branding_code';

function resolveBrand(code) {
    if (!code) return BRANDS.default;
    return BRANDS[String(code).toUpperCase()] || BRANDS.default;
}

function applyBrand(brand) {
    try {
        if (document.title !== undefined) document.title = brand.title;
        document.querySelectorAll('.brand-name').forEach((el) => {
            el.innerHTML = `${brand.firstLine}<br/>${brand.secondLine}`;
        });
        document.querySelectorAll('.brand-logo, .license-hero-img').forEach((el) => {
            el.setAttribute('src', brand.logoSrc);
        });
    } catch {
        /* noop */
    }
}

async function applyStoredBranding() {
    try {
        const stored = await chrome.storage.local.get(BRAND_STORAGE_KEY);
        applyBrand(resolveBrand(stored[BRAND_STORAGE_KEY]));
    } catch {
        applyBrand(BRANDS.default);
    }
}

async function setBrandingCode(code) {
    const value = code ? String(code).toUpperCase() : null;
    try {
        if (value) {
            await chrome.storage.local.set({ [BRAND_STORAGE_KEY]: value });
        } else {
            await chrome.storage.local.remove(BRAND_STORAGE_KEY);
        }
    } catch {
        /* noop */
    }
    applyBrand(resolveBrand(value));
}

window.__lvblBranding = { applyStoredBranding, setBrandingCode, applyBrand, resolveBrand };
