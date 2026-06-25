import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "./locales/en.json";
import frTranslations from "./locales/fr.json";
import arTranslations from "./locales/ar.json";

const savedLang = localStorage.getItem("app_lang") || "fr";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      fr: { translation: frTranslations },
      ar: { translation: arTranslations },
    },
    lng: savedLang,
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false, // React already safeguards against XSS
    },
  });

// Automatically handle RTL / LTR document attributes when language changes
const updateDocumentDirection = (lng: string) => {
  const dir = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
  localStorage.setItem("app_lang", lng);

  // Load custom fonts depending on language for better styling
  const arabicFontUrl = "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap";
  const defaultFontUrl = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

  let fontLink = document.getElementById("app-font-link") as HTMLLinkElement;
  if (!fontLink) {
    fontLink = document.createElement("link");
    fontLink.id = "app-font-link";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
  }
  fontLink.href = lng === "ar" ? arabicFontUrl : defaultFontUrl;
};

// Initial run
updateDocumentDirection(savedLang);

// Listen to language changes
i18n.on("languageChanged", (lng) => {
  updateDocumentDirection(lng);
});

export default i18n;
