import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useLanguage } from '@/context/LanguageContext';
import LanguagePicker from '@/components/LanguagePicker';
import Ionicons from "@expo/vector-icons/Ionicons";
import { api } from "@/services/api";

export default function SettingsScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const colors = useThemeColors();
  const { t } = useLanguage();

  // Change Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Change Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert(t('auth.fieldsRequired'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert(t('auth.passwordsMatch'));
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      Alert.alert(t('settings.passwordChanged'));
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      Alert.alert(t('auth.error'), err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !emailCurrentPassword) {
      Alert.alert(t('auth.fieldsRequired'));
      return;
    }
    setChangingEmail(true);
    try {
      await api.changeEmail(newEmail.trim(), emailCurrentPassword);
      await refreshProfile();
      Alert.alert(t('settings.emailChanged'));
      setShowEmailModal(false);
      setNewEmail("");
      setEmailCurrentPassword("");
      // The server returns new tokens, which our api method already updates,
      // so next API calls will use the new email.
    } catch (err: any) {
      Alert.alert(t('auth.error'), err.message);
    } finally {
      setChangingEmail(false);
    }
  };

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
      {/* Language picker – top right */}
      <View style={{ position: 'absolute', top: 64, right: 12, zIndex: 10 }}>
        <LanguagePicker />
      </View>

      {/* Profile section */}
      <View style={styles.profileSection}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="person" size={100} color={colors.linkColor} />
        </View>

        <Text style={[styles.displayName, { color: colors.textColor }]}>
          {user?.displayName || "—"}
        </Text>

        <Text style={[styles.email, { color: colors.isDark ? '#aaa' : '#6b7280' }]}>
          {user?.email || t('settings.notSignedIn')}
        </Text>

      </View>

      {/* Buttons for changing password and email */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.linkColor }]}
          onPress={() => setShowPasswordModal(true)}
        >
          <Text style={styles.actionBtnText}>
            {t('settings.changePassword')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.linkColor }]}
          onPress={() => setShowEmailModal(true)}
        >
          <Text style={styles.actionBtnText}>
            {t('settings.changeEmail')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </TouchableOpacity>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg || colors.inputBg }]}>
            <Text style={[styles.modalTitle, { color: colors.textColor }]}>
              {t('settings.changePasswordTitle')}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.textColor }]}
              placeholder={t('settings.currentPassword')}
              placeholderTextColor={colors.placeholderColor}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.textColor }]}
              placeholder={t('settings.newPassword')}
              placeholderTextColor={colors.placeholderColor}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.textColor }]}
              placeholder={t('settings.confirmNewPassword')}
              placeholderTextColor={colors.placeholderColor}
              secureTextEntry
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.isDark ? '#444' : '#d1d5db' }]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={{ color: colors.textColor }}>{t('map.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.linkColor }]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{t('settings.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Email Modal */}
      <Modal visible={showEmailModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg || colors.inputBg }]}>
            <Text style={[styles.modalTitle, { color: colors.textColor }]}>
              {t('settings.changeEmailTitle')}
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.textColor }]}
              placeholder={t('settings.newEmail')}
              placeholderTextColor={colors.placeholderColor}
              keyboardType="email-address"
              autoCapitalize="none"
              value={newEmail}
              onChangeText={setNewEmail}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.textColor }]}
              placeholder={t('settings.currentPassword')}
              placeholderTextColor={colors.placeholderColor}
              secureTextEntry
              value={emailCurrentPassword}
              onChangeText={setEmailCurrentPassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.isDark ? '#444' : '#d1d5db' }]}
                onPress={() => setShowEmailModal(false)}
              >
                <Text style={{ color: colors.textColor }}>{t('map.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.linkColor }]}
                onPress={handleChangeEmail}
                disabled={changingEmail}
              >
                {changingEmail ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{t('settings.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginTop: -80,
  },
  avatarContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    marginBottom: 24,
  },
  actionButtons: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  // Modal styles
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});