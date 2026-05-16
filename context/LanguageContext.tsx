import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import * as Localization from 'expo-localization';

// Statically import all translation files.
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import kz from '../locales/kz.json';

const translations: Record<string, any> = { en, ru, kz };

const LANGUAGE_KEY = 'appLanguage';

interface LanguageContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState('en');

  // Load saved language on mount.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (saved && translations[saved]) {
          setLocaleState(saved);
        } else {
          // Fallback to device language.
          const deviceLocale = Localization.getLocales()[0]?.languageCode;
          if (deviceLocale && translations[deviceLocale]) {
            setLocaleState(deviceLocale);
          }
        }
      } catch {}
    })();
  }, []);

  const setLocale = async (newLocale: string) => {
    if (translations[newLocale]) {
      setLocaleState(newLocale);
      await AsyncStorage.setItem(LANGUAGE_KEY, newLocale);
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result: any = translations[locale] || translations.en;
    for (const k of keys) {
        result = result?.[k];
    }
    if (typeof result !== 'string') return key;
    if (params) {
        return result.replace(/\{(\w+)\}/g, (_, name) => {
        return name in params ? String(params[name]) : `{${name}}`;
        });
    }
    return result;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};