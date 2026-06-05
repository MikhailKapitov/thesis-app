import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '@/services/api';
import { useNotificationContext } from '@/context/NotificationContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLanguage } from '@/context/LanguageContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  ACHIEVEMENT_UNLOCKED: '🏆',
  NOISE_ALERT: '🔊',
  RECORDING_FLAGGED: '🚩',
  MODERATION_ALERT: '⚖️',
  WEEKLY_DIGEST: '📊',
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { refreshUnreadCount } = useNotificationContext();
  const colors = useThemeColors();
  const { t } = useLanguage();

  const fetchNotifications = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const data = await api.getNotifications(p, 20);
      if (p === 0) {
        setNotifications(data.content);
      } else {
        setNotifications(prev => [...prev, ...data.content]);
      }
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (err: any) {
      Alert.alert(t('notifications.error'), err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(0);
      refreshUnreadCount();
    }, [fetchNotifications, refreshUnreadCount])
  );

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      refreshUnreadCount();
    } catch (err: any) {
      Alert.alert(t('notifications.error'), err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      refreshUnreadCount();
    } catch (err: any) {
      Alert.alert(t('notifications.error'), err.message);
    }
  };

  const loadMore = () => {
    if (page < totalPages - 1 && !loading) {
      fetchNotifications(page + 1);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notifItem,
        item.read && styles.notifRead,
        {
          backgroundColor: colors.cardBg || colors.inputBg,
          borderLeftColor: item.read ? '#555' : colors.linkColor,
        },
      ]}
      onPress={() => !item.read && handleMarkRead(item.id)}
    >
      <View style={styles.notifHeader}>
        <Text style={styles.notifIcon}>{typeIcons[item.type] || '📌'}</Text>
        <Text style={[styles.notifTitle, { color: colors.textColor }]}>{item.title}</Text>
      </View>
      <Text style={[styles.notifMessage, { color: colors.isDark ? '#ccc' : '#4b5563' }]}>{item.message}</Text>
      <View style={styles.notifFooter}>
        <Text style={[styles.notifTime, { color: colors.isDark ? '#888' : '#6b7280' }]}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
        {!item.read && <Text style={styles.unreadDot}>🔵</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textColor }]}>{t('notifications.title')}</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={[styles.markAllText, { color: colors.linkColor }]}>{t('notifications.markAllRead')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color={colors.linkColor} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchNotifications(0);
            }}
            tintColor={colors.linkColor}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? <Text style={[styles.emptyText, { color: colors.isDark ? '#555' : '#9ca3af' }]}>{t('notifications.noNotifications')}</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    flexWrap: 'wrap',
    fontSize: 18,
    fontWeight: 'bold',
  },
  markAllText: {
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  notifItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  notifRead: {
    opacity: 0.6,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notifIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  notifMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  notifFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTime: {
    fontSize: 12,
  },
  unreadDot: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
});