import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { api } from '@/services/api';

// ---------- Helper ----------
const formatDba = (value: number | null | undefined) =>
  value != null ? value.toFixed(1) : 'N/A';

// ---------- Type definitions ----------
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

interface CityStats {
  avgNoiseLevelDba: number;
  maxNoiseLevelDba: number;
  minNoiseLevelDba: number;
  totalMeasurements: number;
  totalContributors: number;
  measurementsByNoiseClass: Record<string, number>;
  hourlyAverages: { hour: number; avgDba: number; measurementCount: number }[];
}

interface MyStats {
  totalRecordings: number;
  avgExposureDba: number;
  maxExposureDba: number;
  recordingsByNoiseClass: Record<string, number>;
  personalHourlyAverages: any;
  recommendation: string;
}

type ActiveTab = 'profile' | 'leaderboard' | 'statistics';

// ---------- Component ----------
export default function GamificationScreen() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [cityStats, setCityStats] = useState<CityStats | null>(null);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const [profileData, leaderboardData, cityStatsData, myStatsData] = await Promise.all([
        api.getGamificationProfile(),
        api.getLeaderboard(20),
        api.getCityStats(),
        api.getMyStats(),
      ]);
      setProfile(profileData);
      setLeaderboard(leaderboardData);
      setCityStats(cityStatsData);
      setMyStats(myStatsData);
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

  // ---------- Renderers ----------
  const renderAchievement = ({ item }: { item: Achievement }) => (
    <View style={styles.achievementCard}>
      <View style={styles.achievementTitleRow}>
        <Text style={styles.achievementTitle}>
          🏅 {item.title} <Text style={styles.achievementPoints}>+{item.pointsAwarded} pts</Text>
        </Text>
      </View>
      <Text style={styles.achievementDesc}>{item.description}</Text>
      <Text style={styles.achievementDate}>{new Date(item.unlockedAt).toLocaleDateString()}</Text>
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
        isYou && styles.leaderYou,
      ]}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{item.rank}</Text>
        </View>
        <View style={styles.leaderInfo}>
          <Text style={styles.leaderName} numberOfLines={1}>
            {isYou ? 'You' : `${item.userId.slice(0, 8)}...`}
          </Text>
          <Text style={styles.leaderStats}>{item.totalPoints} pts · Level {item.level}</Text>
        </View>
        <Text style={styles.leaderRecordings}>{item.totalRecordings} rec</Text>
      </View>
    );
  };

  // ---------- Statistics tab content ----------
  const renderStatistics = () => {
    if (!cityStats || !myStats) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No statistics available</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#2563eb" />
        }
      >
        {/* City Statistics */}
        <Text style={styles.sectionTitle}>City Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{formatDba(cityStats.avgNoiseLevelDba)}</Text>
            <Text style={styles.statLabel}>Avg. dB</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{formatDba(cityStats.maxNoiseLevelDba)}</Text>
            <Text style={styles.statLabel}>Max dB</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{cityStats.totalMeasurements}</Text>
            <Text style={styles.statLabel}>Measurements</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{cityStats.totalContributors}</Text>
            <Text style={styles.statLabel}>Contributors</Text>
          </View>
        </View>

        {/* Noise Class Breakdown */}
        <Text style={styles.subSectionTitle}>By Noise Type</Text>
        {Object.entries(cityStats.measurementsByNoiseClass ?? {}).map(([cls, count]) => (
          <View key={cls} style={styles.classRow}>
            <Text style={styles.className}>{cls}</Text>
            <View style={styles.classBarContainer}>
              <View style={[
                styles.classBar,
                { width: `${Math.min(100, (count / cityStats.totalMeasurements) * 100)}%` as any }
              ]} />
            </View>
            <Text style={styles.classCount}>{count}</Text>
          </View>
        ))}

        {/* Personal Statistics */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Your Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{myStats.totalRecordings}</Text>
            <Text style={styles.statLabel}>Recordings</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{formatDba(myStats.avgExposureDba)}</Text>
            <Text style={styles.statLabel}>Avg. dB</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{formatDba(myStats.maxExposureDba)}</Text>
            <Text style={styles.statLabel}>Max dB</Text>
          </View>
        </View>

        {/* Personal Noise Classes */}
        {Object.keys(myStats.recordingsByNoiseClass ?? {}).length > 0 && (
          <>
            <Text style={styles.subSectionTitle}>Your Noise Mix</Text>
            {Object.entries(myStats.recordingsByNoiseClass ?? {}).map(([cls, count]) => (
              <View key={cls} style={styles.classRow}>
                <Text style={styles.className}>{cls}</Text>
                <View style={styles.classBarContainer}>
                  <View style={[
                    styles.classBar,
                    { width: `${Math.min(100, (count / myStats.totalRecordings) * 100)}%` as any }
                  ]} />
                </View>
                <Text style={styles.classCount}>{count}</Text>
              </View>
            ))}
          </>
        )}

        {/* Recommendation */}
        {myStats.recommendation ? (
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>Health Advice</Text>
            <Text style={styles.recommendationText}>{myStats.recommendation}</Text>
          </View>
        ) : null}
      </ScrollView>
    );
  };

  // ---------- Main view ----------
  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={styles.tabText}>Me</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={styles.tabText}>Leaderboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'statistics' && styles.tabActive]}
          onPress={() => setActiveTab('statistics')}
        >
          <Text style={styles.tabText}>Statistics</Text>
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
          ListEmptyComponent={() => <Text style={styles.emptyText}>No achievements yet</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#2563eb" />
          }
        />
      ) : activeTab === 'leaderboard' ? (
        <FlatList
          data={leaderboard}
          keyExtractor={item => item.userId}
          renderItem={renderLeader}
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={() => <Text style={styles.emptyText}>Leaderboard unavailable</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#2563eb" />
          }
        />
      ) : (
        renderStatistics()
      )}
    </View>
  );
}

// ---------- Styles (same as before) ----------
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
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 8,
    marginTop: 8,
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
  leaderYou: {
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  scrollArea: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  className: {
    color: '#ccc',
    width: 80,
  },
  classBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginHorizontal: 10,
  },
  classBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 4,
  },
  classCount: {
    color: '#94a3b8',
    width: 40,
    textAlign: 'right',
  },
  recommendationBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  recommendationTitle: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
  },
  recommendationText: {
    color: '#ddd',
    fontSize: 14,
  },
});