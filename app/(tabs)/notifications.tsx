import { useState, useEffect, useCallback } from 'react';
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
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Refresh list and unread count when screen is focused
      fetchNotifications(0);
      refreshUnreadCount();
    }, [fetchNotifications, refreshUnreadCount])
  );

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      refreshUnreadCount();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      // Mark all local items as read
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      refreshUnreadCount();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const loadMore = () => {
    if (page < totalPages - 1 && !loading) {
      fetchNotifications(page + 1);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notifItem, item.read && styles.notifRead]}
      onPress={() => !item.read && handleMarkRead(item.id)}
    >
      <View style={styles.notifHeader}>
        <Text style={styles.notifIcon}>{typeIcons[item.type] || '📌'}</Text>
        <Text style={styles.notifTitle}>{item.title}</Text>
      </View>
      <Text style={styles.notifMessage}>{item.message}</Text>
      <View style={styles.notifFooter}>
        <Text style={styles.notifTime}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
        {!item.read && <Text style={styles.unreadDot}>🔵</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color="#2563eb" /> : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchNotifications(0);
            }}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No notifications yet</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  markAllText: {
    color: '#2563eb',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  notifItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  notifRead: {
    opacity: 0.6,
    borderLeftColor: '#555',
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
    color: '#fff',
    flex: 1,
  },
  notifMessage: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  notifFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTime: {
    fontSize: 12,
    color: '#888',
  },
  unreadDot: {
    fontSize: 12,
  },
  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
});