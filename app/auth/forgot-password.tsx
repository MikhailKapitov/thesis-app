import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { api } from '@/services/api';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLanguage } from '@/context/LanguageContext';
import { Link } from 'expo-router';
import LanguagePicker from '@/components/LanguagePicker';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const colors = useThemeColors();
  const { t } = useLanguage();

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(t('auth.fieldsRequired'));
      return;
    }
    setLoading(true);
    try {
      const message = await api.forgotPassword(email.trim());
      Alert.alert(message);
      setEmail('');
    } catch (err: any) {
      Alert.alert(t('auth.error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardView, { backgroundColor: colors.backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ position: 'absolute', top: 64, right: 12, zIndex: 10 }}>
            <LanguagePicker />
        </View>
        <Text style={[styles.title, { color: colors.textColor }]}>
          {t('auth.forgotPasswordTitle')}
        </Text>
        <Text style={[styles.prompt, { color: colors.placeholderColor }]}>
          {t('auth.forgotPasswordPrompt')}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textColor }]}
          placeholder={t('auth.email')}
          placeholderTextColor={colors.placeholderColor}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={handleForgotPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.sendResetLink')}</Text>
          )}
        </TouchableOpacity>
        <Link href="/auth/login" style={[styles.link, { color: colors.linkColor }]}>
          {t('auth.backToLogin')}
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  prompt: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});