// i18n.js - Internationalization Manager
class I18n {
    constructor() {
        this.currentLang = 'en';
        this.translations = {};
        this.rtlLanguages = ['fa', 'ar', 'he'];
    }

    async loadLanguage(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Language file not found: ${lang}`);
            }
            this.translations[lang] = await response.json();
            return true;
        } catch (error) {
            console.error(`Failed to load language ${lang}:`, error);
            return false;
        }
    }

    async setLanguage(lang) {
        if (lang === this.currentLang) return;
        
        // Load language if not already loaded
        if (!this.translations[lang]) {
            const loaded = await this.loadLanguage(lang);
            if (!loaded) return false;
        }
        
        this.currentLang = lang;
        
        // Update HTML dir attribute
        const isRTL = this.rtlLanguages.includes(lang);
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        
        // Apply translations
        this.applyTranslations();
        
        return true;
    }

    applyTranslations() {
        const langData = this.translations[this.currentLang];
        if (!langData) return;

        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key, langData);
            if (translation) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    if (element.getAttribute('data-i18n-placeholder')) {
                        element.placeholder = translation;
                    } else {
                        element.value = translation;
                    }
                } else {
                    element.textContent = translation;
                }
            }
        });

        // Translate title
        if (langData.app && langData.app.title) {
            document.title = langData.app.title;
        }
    }

    getTranslation(key, data = null) {
        if (!data) {
            data = this.translations[this.currentLang];
            if (!data) return key;
        }

        const keys = key.split('.');
        let result = data;
        
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            } else {
                return key; // Return key if translation not found
            }
        }
        
        return typeof result === 'string' ? result : key;
    }

    t(key, params = {}) {
        let translation = this.getTranslation(key);
        
        // Replace parameters
        if (params && typeof params === 'object') {
            Object.keys(params).forEach(param => {
                translation = translation.replace(`{${param}}`, params[param]);
            });
        }
        
        return translation;
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    isRTL() {
        return this.rtlLanguages.includes(this.currentLang);
    }
}

// Create global i18n instance
const i18n = new I18n();

// Global function to switch language
async function switchLanguage(lang) {
    const success = await i18n.setLanguage(lang);
    if (success) {
        // Save preference to localStorage
        localStorage.setItem('preferredLanguage', lang);
        
        // Update UI if needed
        updateUIForLanguage(lang);
    }
}

function updateUIForLanguage(lang) {
    // Add any language-specific UI updates here
    console.log(`Language switched to: ${lang}`);
}

// Load default language on startup
document.addEventListener('DOMContentLoaded', async () => {
    // Try to get saved language preference
    const savedLang = localStorage.getItem('preferredLanguage') || 'en';
    
    // Load both languages for switching
    await i18n.loadLanguage('en');
    await i18n.loadLanguage('fa');
    
    // Set initial language
    await i18n.setLanguage(savedLang);
});