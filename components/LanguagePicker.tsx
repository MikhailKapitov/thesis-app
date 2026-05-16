import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { useThemeColors } from '@/hooks/useThemeColors';

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'kz', label: 'KZ' },
];

export default function LanguagePicker() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const colors = useThemeColors();

  const current = languages.find(l => l.code === locale) || languages[0];

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.inputBg }]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Text style={[styles.text, { color: colors.textColor }]}>
          🌐 {current.label}
        </Text>
      </TouchableOpacity>

      {open && (
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.dropdown, { backgroundColor: colors.cardBg || colors.inputBg }]}>
            {languages.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.option, locale === lang.code && { backgroundColor: colors.linkColor + '33' }]}
                onPress={() => {
                  setLocale(lang.code);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, { color: colors.textColor }]}>
                  {lang.label}
                  {locale === lang.code ? ' ✓' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',  // for the dropdown positioning
    alignSelf: 'flex-start',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 70,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    zIndex: 100,
    // no backdrop, just the menu
  },
  dropdown: {
    borderRadius: 10,
    padding: 4,
    minWidth: 80,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 2,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});