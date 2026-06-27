import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Profile</Text>

      {/* Avatar card */}
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.role}>
              {user?.role?.replace('ROLE_', '') || 'User'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <InfoRow icon="👤" label="Username" value={user?.username || '—'} />
        <InfoRow icon="📧" label="Email" value={user?.email || '—'} />
        <InfoRow icon="🛡" label="Role" value={user?.role || '—'} />
        {user?.createdAt && (
          <InfoRow icon="📅" label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />
        )}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },
  content: { padding: SPACING.xl, paddingBottom: SPACING.xxxl, gap: SPACING.lg },
  pageTitle: { color: COLORS.white, fontSize: FONT.xxl, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.greenDim,
    borderWidth: 2,
    borderColor: 'rgba(74,222,128,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.green, fontSize: FONT.xxl, fontWeight: '800' },
  username: { color: COLORS.white, fontSize: FONT.xl, fontWeight: '700' },
  role: { color: COLORS.gray400, fontSize: FONT.sm },
  divider: { height: 1, backgroundColor: COLORS.border },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.dark,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
  },
  infoIcon: { fontSize: 16 },
  infoLabel: { color: COLORS.gray500, fontSize: FONT.xs },
  infoValue: { color: COLORS.white, fontSize: FONT.sm },
  signOutBtn: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.05)',
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  signOutText: { color: COLORS.red, fontWeight: '600', fontSize: FONT.base },
});
