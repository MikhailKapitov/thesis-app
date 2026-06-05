import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useLanguage } from '@/context/LanguageContext';
import LanguagePicker from '@/components/LanguagePicker';
import Ionicons from "@expo/vector-icons/Ionicons";

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
      <View style={{ position: 'absolute', top: 64, right: 12, zIndex: 10 }}>
        <LanguagePicker />
      </View>

      {/* Profile section. */}
      <View style={styles.profileSection}>
        {/* Avatar. */}
        <View style={[styles.avatarContainer, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="person" size={100} color={colors.linkColor} />
        </View>

        {/* Display name. */}
        <Text style={[styles.displayName, { color: colors.textColor }]}>
          {user?.displayName || "—"}
        </Text>

        {/* Email. */}
        <Text style={[styles.email, { color: colors.isDark ? '#aaa' : '#6b7280' }]}>
          {user?.email || t('settings.notSignedIn')}
        </Text>
      </View>

      {/* Logout button. */}
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
  profileSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -240,
  },
  avatarContainer: {
    width: 160,
    height: 160,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: "#dc2626",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});