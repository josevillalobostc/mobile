import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

export default function LoginScreen() {
  const { login, register, token, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  if (token) {
    return <Redirect href="/(tabs)/graph" />;
  }

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Username and password are required');
      return;
    }
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)/graph');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Invalid credentials';
      Alert.alert('Login failed', msg);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    try {
      await register(username.trim(), email.trim(), password);
      Alert.alert('Success', 'Account created! Please log in.', [
        { text: 'OK', onPress: () => setMode('login') },
      ]);
      setPassword('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Registration failed';
      Alert.alert('Registration failed', msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>✦</Text>
          </View>
          <Text style={styles.logoText}>Grove</Text>
        </View>

        <Text style={styles.tagline}>
          Knowledge graphs{'\n'}
          <Text style={{ color: COLORS.green }}>reimagined.</Text>
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[{ label: 'Concepts', value: '∞' }, { label: 'Flashcards', value: 'SRS' }, { label: 'Paths', value: 'AI' }].map(({ label, value }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Auth card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {mode === 'login' ? 'Sign in to Grove' : 'Create account'}
          </Text>

          {/* Mode switcher */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            <View>
              <Text style={styles.label}>Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="your_username"
                placeholderTextColor={COLORS.gray600}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {mode === 'register' && (
              <View>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.gray600}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            <View>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.gray600}
                style={styles.input}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading
                ? mode === 'login' ? 'Signing in...' : 'Creating...'
                : mode === 'login' ? 'Sign in' : 'Create account'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },
  scroll: { flexGrow: 1, padding: SPACING.xl, paddingTop: 64 },
  logoArea: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xl },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { color: COLORS.white, fontSize: 20, fontWeight: '900' },
  logoText: { color: COLORS.white, fontSize: FONT.xxxl, fontWeight: '800' },
  tagline: { color: COLORS.white, fontSize: FONT.xxl, fontWeight: '700', marginBottom: SPACING.xl, lineHeight: 34 },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xxl },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: { color: COLORS.green, fontSize: FONT.lg, fontWeight: '800' },
  statLabel: { color: COLORS.gray500, fontSize: FONT.xs, marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
  },
  cardTitle: { color: COLORS.white, fontSize: FONT.xl, fontWeight: '700', marginBottom: SPACING.lg },
  modeRow: { flexDirection: 'row', backgroundColor: COLORS.dark, borderRadius: RADIUS.sm, padding: 4, marginBottom: SPACING.lg },
  modeBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm - 2, alignItems: 'center' },
  modeBtnActive: { backgroundColor: COLORS.surface },
  modeBtnText: { color: COLORS.gray500, fontSize: FONT.sm, fontWeight: '600' },
  modeBtnTextActive: { color: COLORS.white },
  fields: { gap: SPACING.md, marginBottom: SPACING.lg },
  label: { color: COLORS.gray300, fontSize: FONT.sm, fontWeight: '500', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.white,
    fontSize: FONT.base,
  },
  primaryBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT.base },
  btnDisabled: { opacity: 0.5 },
});
