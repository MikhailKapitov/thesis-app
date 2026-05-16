import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const colors = useThemeColors();

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.title, { color: colors.textColor }]}>Settings</Text>

      <View style={styles.section}>
        <Text style={[styles.label, { color: colors.isDark ? '#888' : '#6b7280' }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.userInfo, { color: colors.textColor }]}>
            Email: {user?.email || "Not signed in"}
          </Text>
          <Text style={[styles.userInfo, { color: colors.textColor }]}>Name: {user?.displayName || "—"}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
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