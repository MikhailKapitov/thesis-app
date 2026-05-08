import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { api } from '@/services/api';

interface Achievement {
  code: string;
  title: string;
  description: string;
  pointsAwarded: number;
  unlockedAt: string;
}

interface GamificationProfile {
  userId: string;
  totalPoints: number;
  totalRecordings: number;
  level: number;
  currentStreak: number;
  achievements: Achievement[];
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  totalPoints: number;
  totalRecordings: number;
  level: number;
}

export default function GamificationScreen() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'leaderboard'>('profile');

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const [profileData, leaderboardData] = await Promise.all([
        api.getGamificationProfile(),
        api.getLeaderboard(20),
      ]);
      setProfile(profileData);
      setLeaderboard(leaderboardData);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderAchievement = ({ item }: { item: Achievement }) => (
    <View style={styles.achievementCard}>
      <View style={styles.achievementTitleRow}>
        <Text style={styles.achievementTitle}>
          🏅 {item.title} <Text style={styles.achievementPoints}>+{item.pointsAwarded} pts</Text>
        </Text>
      </View>
      <Text style={styles.achievementDesc}>{item.description}</Text>
      <Text style={styles.achievementDate}>
        {new Date(item.unlockedAt).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderLeader = ({ item }: { item: LeaderboardEntry }) => {
    const isYou = profile?.userId === item.userId;

    return (
      <View style={[
        styles.leaderCard,
        item.rank === 1 && styles.leaderTop,
        item.rank === 2 && styles.leaderSecond,
        item.rank === 3 && styles.leaderThird,
        isYou && styles.leaderYou,   // <-- special style for yourself
      ]}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{item.rank}</Text>
        </View>
        <View style={styles.leaderInfo}>
          <Text style={styles.leaderName} numberOfLines={1}>
            {isYou ? 'You' : `${item.userId.slice(0, 8)}...`}
          </Text>
          <Text style={styles.leaderStats}>
            {item.totalPoints} pts · Level {item.level}
          </Text>
        </View>
        <Text style={styles.leaderRecordings}>{item.totalRecordings} rec</Text>
      </View>
    );
  };

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={styles.tabText}>My Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={styles.tabText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'profile' ? (
        <FlatList
          data={profile?.achievements || []}
          keyExtractor={item => item.code}
          renderItem={renderAchievement}
          ListHeaderComponent={() => (
            <View>
              {profile && (
                <View style={styles.profileCard}>
                  <Text style={styles.levelText}>Level {profile.level}</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{profile.totalPoints}</Text>
                      <Text style={styles.statLabel}>Points</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{profile.totalRecordings}</Text>
                      <Text style={styles.statLabel}>Recordings</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statNumber}>{profile.currentStreak}</Text>
                      <Text style={styles.statLabel}>Day Streak</Text>
                    </View>
                  </View>
                </View>
              )}
              <Text style={styles.sectionTitle}>Achievements</Text>
            </View>
          )}
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No achievements yet</Text>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor="#2563eb"
            />
          }
        />
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={item => item.userId}
          renderItem={renderLeader}
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>Leaderboard unavailable</Text>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor="#2563eb"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginTop: 60,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    color: '#fff',
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  levelText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fbbf24',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    paddingLeft: 4,
  },
  achievementCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  achievementTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  achievementTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  achievementPoints: {
    color: '#fbbf24',
    fontSize: 14,
  },
  achievementDesc: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 8,
  },
  achievementDate: {
    color: '#666',
    fontSize: 12,
  },
  leaderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaderTop: {
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  leaderSecond: {
    borderLeftWidth: 4,
    borderLeftColor: '#c0c0c0',
  },
  leaderThird: {
    borderLeftWidth: 4,
    borderLeftColor: '#cd7f32',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  leaderStats: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  leaderRecordings: {
    color: '#2563eb',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
    leaderYou: {
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
});