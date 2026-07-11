import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Resources – you can load from JSON files or API
const resources = {
    en: {
        translation: {
            welcome: "Welcome",
            login: "Login",
            logout: "Logout",
            // ...
        },
    },
    ar: {
        translation: {
            welcome: "مرحباً",
            login: "تسجيل الدخول",
            logout: "تسجيل الخروج",
            // ...
        },
    },
};

i18n.use(initReactI18next).init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;