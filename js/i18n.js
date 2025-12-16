// i18n.js - Internationalization Manager
class I18n {
  constructor() {
    this.currentLang = "en";
    this.translations = {};
    this.rtlLanguages = ["fa", "ar", "he"];
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

      // Fallback to default English
      if (lang !== "en") {
        return await this.loadLanguage("en");
      }
      return false;
    }
  }

  async setLanguage(lang) {
    if (lang === this.currentLang && this.translations[lang]) return true;

    // Load language if not already loaded
    if (!this.translations[lang]) {
      const loaded = await this.loadLanguage(lang);
      if (!loaded) return false;
    }

    this.currentLang = lang;

    // Update HTML dir attribute
    const isRTL = this.rtlLanguages.includes(lang);
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = lang;

    // Apply translations
    this.applyTranslations();

    // Update localStorage
    localStorage.setItem("preferredLanguage", lang);

    return true;
  }

  applyTranslations() {
    const langData = this.translations[this.currentLang];
    if (!langData) return;

    // Translate elements with data-i18n attribute
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const translation = this.getTranslation(key, langData);
      if (translation) {
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          if (element.getAttribute("data-i18n-placeholder")) {
            element.placeholder = translation;
          } else {
            element.value = translation;
          }
        } else {
          element.textContent = translation;
        }
      }
    });

    // Translate placeholder attributes
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      const translation = this.getTranslation(key, langData);
      if (translation) {
        element.placeholder = translation;
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

    const keys = key.split(".");
    let result = data;

    for (const k of keys) {
      if (result && typeof result === "object" && k in result) {
        result = result[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    // Handle arrays (for lists)
    if (Array.isArray(result)) {
      return result.join("\n");
    }

    return typeof result === "string" ? result : key;
  }

  t(key, params = {}) {
    let translation = this.getTranslation(key);

    // Replace parameters
    if (params && typeof params === "object") {
      Object.keys(params).forEach((param) => {
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
  console.log("Switching language to:", lang);

  try {
    // Set the language
    await i18n.setLanguage(lang);

    // Update language buttons
    document.querySelectorAll(".language-switcher button").forEach((btn) => {
      if (btn.textContent.includes(lang === "en" ? "English" : "فارسی")) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Show success message
    const message =
      lang === "en"
        ? "Language switched to English"
        : "زبان به فارسی تغییر یافت";

    // Try to show toast
    if (window.app && window.app.toast) {
      window.app.toast.success(message);
    } else if (toastManager) {
      toastManager.success(message);
    }

    console.log("Language switched successfully");
  } catch (error) {
    console.error("Error switching language:", error);

    // Try to show error toast
    if (toastManager) {
      toastManager.error("Failed to switch language");
    }
  }
}

function updateUIForLanguage(lang) {
  // Add any language-specific UI updates here
  console.log(`Language switched to: ${lang}`);
}

// Load default language on startup
document.addEventListener("DOMContentLoaded", async () => {
  // Try to get saved language preference
  const savedLang = localStorage.getItem("preferredLanguage") || "en";

  // Load both languages for switching
  await i18n.loadLanguage("en");
  await i18n.loadLanguage("fa");

  // Set initial language
  await i18n.setLanguage(savedLang);
});
