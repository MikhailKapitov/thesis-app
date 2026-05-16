import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useLanguage } from '@/context/LanguageContext';
import LanguagePicker from '@/components/LanguagePicker';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const colors = useThemeColors();
  const { t } = useLanguage();

  const handleLogout = async () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('settings.cancel'), style: "cancel" },
      {
        text: t('settings.logout'),
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.title, { color: colors.textColor }]}>{t('settings.title')}</Text>

      <View style={{ position: 'absolute', top: 64, right: 12, zIndex: 10 }}>
        <LanguagePicker />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.isDark ? '#888' : '#6b7280' }]}>{t('settings.account')}</Text>
        <View style={[styles.card, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.userInfo, { color: colors.textColor }]}>
            {t('settings.email')}: {user?.email || t('settings.notSignedIn')}
          </Text>
          <Text style={[styles.userInfo, { color: colors.textColor }]}>{t('settings.name')}: {user?.displayName || "—"}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 8,
  },
  logoutButton: {
    backgroundColor: "#dc2626",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 20,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});