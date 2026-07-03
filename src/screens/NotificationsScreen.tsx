import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList, StyleSheet, Alert,
} from 'react-native';
import { Bell, Check, Trash2 } from 'lucide-react-native';
import { getNotifications, markNotificationRead, deleteNotification } from '../api';
import type { NotificationResponse } from '../types';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { COLORS, SPACING, RADIUS, FONT } from '../theme';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { data, loading, refetch } = useFetch<NotificationResponse[]>(
    () => getNotifications(user?.id || ''),
    [user?.id]
  );
  const [processing, setProcessing] = useState<string | null>(null);

  const handleMarkRead = async (id: string) => {
    setProcessing(id);
    try {
      await markNotificationRead(id);
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to mark as read');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    setProcessing(id);
    try {
      await deleteNotification(id);
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to delete notification');
    } finally {
      setProcessing(null);
    }
  };

  const unreadCount = data?.filter((n) => !n.read).length || 0;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xl }}>
            <Bell size={24} color={COLORS.white} />
            <Text style={[styles.headerTitle, { marginBottom: 0 }]}>Notifications</Text>
          </View>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount} unread</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <View style={styles.emptyState}>
          <Bell size={40} color={COLORS.gray500} />
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.notifCard, item.read && styles.notifCardRead]}>
              <View style={[styles.dot, item.read && styles.dotRead]} />
              <View style={styles.notifBody}>
                <Text style={styles.notifMessage}>{item.message}</Text>
                <Text style={styles.notifDate}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
              <View style={styles.notifActions}>
                {!item.read && (
                  <TouchableOpacity
                    onPress={() => handleMarkRead(item.id)}
                    disabled={processing === item.id}
                    style={styles.actionBtn}
                  >
                    <Check size={14} color={COLORS.green} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  disabled={processing === item.id}
                  style={[styles.actionBtn, styles.deleteBtn]}
                >
                  <Trash2 size={16} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.dark },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  headerTitle: { color: COLORS.white, fontSize: FONT.xl, fontWeight: '700' },
  unreadBadge: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  unreadText: { color: COLORS.gray500, fontSize: FONT.xs },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: COLORS.gray400, fontSize: FONT.base },
  list: { padding: SPACING.xl, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  notifCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  notifCardRead: {
    borderColor: COLORS.border,
    opacity: 0.6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginTop: 6,
    flexShrink: 0,
  },
  dotRead: { backgroundColor: COLORS.gray600 },
  notifBody: { flex: 1 },
  notifMessage: { color: COLORS.gray300, fontSize: FONT.sm, lineHeight: 18 },
  notifDate: { color: COLORS.gray600, fontSize: FONT.xs, marginTop: 4 },
  notifActions: { flexDirection: 'row', gap: SPACING.xs, alignItems: 'center' },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.greenDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: COLORS.green, fontSize: FONT.sm },
  deleteBtn: { backgroundColor: COLORS.redDim },
  deleteBtnText: { fontSize: FONT.sm },
});
