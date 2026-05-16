import { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Link } from "expo-router";
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLanguage } from '@/context/LanguageContext';
import LanguagePicker from '@/components/LanguagePicker';

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { backgroundColor, textColor, inputBg, placeholderColor, linkColor } = useThemeColors();
  const { t } = useLanguage();

  const handleRegister = async () => {
    if (!email || !displayName || !password || !confirmPassword) {
      Alert.alert(t('auth.registerFailed'), t('auth.fieldsRequired'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('auth.registerFailed'), t('auth.passwordsMatch'));
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName);
    } catch (error: any) {
      Alert.alert(t('auth.registerFailed'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardView, { backgroundColor }]}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ position: 'absolute', top: 64, right: 12, zIndex: 10 }}>
          <LanguagePicker />
        </View>
        <Text style={[styles.title, { color: textColor }]}>{t('auth.registerTitle')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
          placeholder={t('auth.displayName')}
          placeholderTextColor={placeholderColor}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
          placeholder={t('auth.email')}
          placeholderTextColor={placeholderColor}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
          placeholder={t('auth.password')}
          placeholderTextColor={placeholderColor}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, color: textColor }]}
          placeholder={t('auth.confirmPassword')}
          placeholderTextColor={placeholderColor}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.registerButton')}</Text>
          )}
        </TouchableOpacity>
        <Link href="/auth/login" style={[styles.link, { color: linkColor }]}>
          {t('auth.hasAccount')}
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  link: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
});