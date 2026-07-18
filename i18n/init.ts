// i18n/init.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
        lng: 'en', // Default language
        fallbackLng: 'en',
        ns: ['common'],      // 🚨 Tell i18next about your 'common' file
        defaultNS: 'common', // 🚨 Set it as the default for useTranslation()
        interpolation: { escapeValue: false },
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },
    });

export default i18n;