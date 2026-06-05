import { useColorScheme } from 'react-native';

export function useThemeColors() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    backgroundColor: isDark ? '#0f0f0f' : '#ffffff',
    cardBg: isDark ? '#1a1a1a' : '#f3f4f6',
    modalBg: isDark ? '#111111' : '#e9ecef',
    textColor: isDark ? '#ffffff' : '#1f2937',
    inputBg: isDark ? '#1a1a1a' : '#f3f4f6',
    placeholderColor: isDark ? '#888' : '#9ca3af',
    linkColor: '#2563eb',  // Brand colour stays the same regardless.
  };
}