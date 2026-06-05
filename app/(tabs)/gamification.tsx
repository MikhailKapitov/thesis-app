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
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLanguage } from '@/context/LanguageContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

// Helper
const formatDba = (value: number | null | undefined) =>
  value != null ? value.toFixed(1) : 'N/A';

// Type definitions
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
  displayName: string;
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
  recommendationKey: string;
}

interface Recording {
  id: string;
  latitude: number;
  longitude: number;
  status: string;
  noiseLevelDba: number | null;
  noiseClass: string | null;
  confidenceScore: number | null;
  recordedAt: string;
  createdAt: string;
}

type ActiveTab = 'profile' | 'leaderboard' | 'statistics';

// Component
export default function GamificationScreen() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [cityStats, setCityStats] = useState<CityStats | null>(null);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [recentRecordings, setRecentRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [showRecentRecordings, setShowRecentRecordings] = useState(false);
  const colors = useThemeColors();
  const { t } = useLanguage();

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const [profileData, leaderboardData, cityStatsData, myStatsData, recordings] = await Promise.all([
        api.getGamificationProfile(),
        api.getLeaderboard(20),
        api.getCityStats(),
        api.getMyStats(),
        api.getMyRecordings(0, 8),
      ]);
      setProfile(profileData);
      setLeaderboard(leaderboardData);
      setCityStats(cityStatsData);
      setMyStats(myStatsData);
      setRecentRecordings([...recordings].reverse());
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Renderers
  const renderAchievement = ({ item }: { item: Achievement }) => (
    <View style={[styles.achievementCard, { backgroundColor: colors.cardBg || colors.inputBg, borderLeftColor: '#fbbf24' }]}>
      <View style={styles.achievementTitleRow}>
        <Text style={[styles.achievementTitle, { color: colors.textColor }]}>
          🏅 {t(`achievements.${item.code}.title`)} <Text style={styles.achievementPoints}>+{item.pointsAwarded} {t('gamification.pts')}</Text>
        </Text>
      </View>
      <Text style={[styles.achievementDesc, { color: colors.isDark ? '#aaa' : '#6b7280' }]}>{t(`achievements.${item.code}.description`)}</Text>
      <Text style={[styles.achievementDate, { color: colors.isDark ? '#666' : '#9ca3af' }]}>{new Date(item.unlockedAt).toLocaleDateString()}</Text>
    </View>
  );

  const renderLeader = ({ item }: { item: LeaderboardEntry }) => {
    const isYou = profile?.userId === item.userId;
    return (
      <View style={[
        styles.leaderCard,
        { backgroundColor: colors.cardBg || colors.inputBg },
        item.rank === 1 && { borderLeftColor: '#fbbf24' },
        item.rank === 2 && { borderLeftColor: '#c0c0c0' },
        item.rank === 3 && { borderLeftColor: '#cd7f32' },
        isYou && { borderLeftColor: colors.linkColor },
      ]}>
        <View style={[styles.rankBadge, { backgroundColor: colors.isDark ? '#333' : '#e5e7eb' }]}>
          <Text style={[styles.rankText, { color: colors.textColor }]}>{item.rank}</Text>
        </View>
        <View style={styles.leaderInfo}>
          <Text style={[styles.leaderName, { color: colors.textColor }]} numberOfLines={1}>
            {isYou ? t('gamification.you') : (item.displayName || `${item.userId.slice(0, 8)}...`)}
          </Text>
          <Text style={[styles.leaderStats, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{item.totalPoints} {t('gamification.pts')} · {t('gamification.level')} {item.level}</Text>
        </View>
        <Text style={[styles.leaderRecordings, { color: colors.linkColor }]}>{item.totalRecordings} {t('gamification.rec')}</Text>
      </View>
    );
  };

  // Statistics tab content
  const renderStatistics = () => {
    if (!cityStats || !myStats) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.isDark ? '#555' : '#9ca3af' }]}>{t('gamification.noStatistics')}</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.linkColor} />
        }
      >
        {/* City Statistics */}
        <Text style={[styles.sectionTitle, { color: colors.textColor }]}>{t('gamification.cityOverview')}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.textColor }]}>{formatDba(cityStats.avgNoiseLevelDba)}</Text>
            <Text style={[styles.statLabel, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{t('gamification.avgDb')}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.textColor }]}>{formatDba(cityStats.maxNoiseLevelDba)}</Text>
            <Text style={[styles.statLabel, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{t('gamification.maxDb')}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.textColor }]}>{cityStats.totalMeasurements}</Text>
            <Text style={[styles.statLabel, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{t('gamification.measurements')}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.textColor }]}>{cityStats.totalContributors}</Text>
            <Text style={[styles.statLabel, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{t('gamification.contributors')}</Text>
          </View>
        </View>

        {/* Noise Class Breakdown */}
        <Text style={[styles.subSectionTitle, { color: colors.isDark ? '#ccc' : '#4b5563' }]}>{t('gamification.byNoiseType')}</Text>
        {Object.entries(cityStats.measurementsByNoiseClass ?? {}).map(([cls, count]) => (
          <View key={cls} style={styles.classRow}>
            <Text style={[styles.className, { color: colors.isDark ? '#ccc' : '#4b5563' }]}>{cls}</Text>
            <View style={[styles.classBarContainer, { backgroundColor: colors.isDark ? '#333' : '#e5e7eb' }]}>
              <View style={[
                styles.classBar,
                { width: `${Math.min(100, (count / cityStats.totalMeasurements) * 100)}%` as any, backgroundColor: colors.linkColor }
              ]} />
            </View>
            <Text style={[styles.classCount, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{count}</Text>
          </View>
        ))}

        {/* Personal Statistics */}
        <Text style={[styles.sectionTitle, { color: colors.textColor, marginTop: 24 }]}>{t('gamification.yourStats')}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.textColor }]}>{myStats.totalRecordings}</Text>
            <Text style={[styles.statLabel, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{t('gamification.recordings')}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.textColor }]}>{formatDba(myStats.avgExposureDba)}</Text>
            <Text style={[styles.statLabel, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{t('gamification.avgDb')}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.textColor }]}>{formatDba(myStats.maxExposureDba)}</Text>
            <Text style={[styles.statLabel, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{t('gamification.maxDb')}</Text>
          </View>
        </View>

        {/* Personal Noise Classes */}
        {Object.keys(myStats.recordingsByNoiseClass ?? {}).length > 0 && (
          <>
            <Text style={[styles.subSectionTitle, { color: colors.isDark ? '#ccc' : '#4b5563' }]}>{t('gamification.yourNoiseMix')}</Text>
            {Object.entries(myStats.recordingsByNoiseClass ?? {}).map(([cls, count]) => (
              <View key={cls} style={styles.classRow}>
                <Text style={[styles.className, { color: colors.isDark ? '#ccc' : '#4b5563' }]}>{cls}</Text>
                <View style={[styles.classBarContainer, { backgroundColor: colors.isDark ? '#333' : '#e5e7eb' }]}>
                  <View style={[
                    styles.classBar,
                    { width: `${Math.min(100, (count / myStats.totalRecordings) * 100)}%` as any, backgroundColor: colors.linkColor }
                  ]} />
                </View>
                <Text style={[styles.classCount, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{count}</Text>
              </View>
            ))}
          </>
        )}

        {/* Recommendation */}
        {myStats.recommendationKey ? (
          <View style={[styles.recommendationBox, { backgroundColor: colors.cardBg || colors.inputBg, borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.recommendationTitle}>{t('gamification.healthAdvice')}</Text>
            <Text style={[styles.recommendationText, { color: colors.isDark ? '#ddd' : '#374151' }]}>{t(`gamification.recommendation.${myStats.recommendationKey}`)}</Text>
          </View>
        ) : null}

        {/* Recent Recordings (collapsible) */}
        <View style={styles.recentSection}>
          <TouchableOpacity
            style={styles.recentHeader}
            onPress={() => setShowRecentRecordings(!showRecentRecordings)}
          >
            <Text style={[styles.recentTitle, { color: colors.textColor }]}>
              {t('gamification.recentRecordings')} ({recentRecordings.length})
            </Text>
            <Ionicons
              name={showRecentRecordings ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textColor}
            />
          </TouchableOpacity>

          {showRecentRecordings && (
            <View style={styles.recentList}>
              {recentRecordings.length === 0 ? (
                <Text style={[styles.recentEmpty, { color: colors.placeholderColor }]}>
                  {t('gamification.noRecentRecordings')}
                </Text>
              ) : (
                recentRecordings.map((rec) => (
                  <View key={rec.id} style={[styles.recentItem, { backgroundColor: colors.inputBg }]}>
                    <View style={styles.recentRow}>
                      <Ionicons
                        name={rec.status === 'PENDING' ? 'time-outline' : 'checkmark-circle-outline'}
                        size={18}
                        color={rec.status === 'PENDING' ? '#f59e0b' : '#22c55e'}
                      />
                      <Text style={[styles.recentDate, { color: colors.textColor }]}>
                        {new Date(rec.recordedAt || rec.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    {rec.status === 'CLASSIFIED' ? (
                      <Text style={[styles.recentDetail, { color: colors.isDark ? '#ccc' : '#4b5563' }]}>
                        {rec.noiseLevelDba?.toFixed(1)} dB · {rec.noiseClass}
                      </Text>
                    ) : (
                      <Text style={[styles.recentDetail, { color: colors.isDark ? '#888' : '#9ca3af' }]}>
                        {t('gamification.pendingClassification')}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Main view
  if (loading && !profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundColor }]}>
        <ActivityIndicator size="large" color={colors.linkColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundColor }]}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.inputBg }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && { backgroundColor: colors.linkColor }]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'profile' ? '#fff' : colors.textColor }]} numberOfLines={1}>{t('gamification.me')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && { backgroundColor: colors.linkColor }]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'leaderboard' ? '#fff' : colors.textColor }]} numberOfLines={1}>{t('gamification.leaderboard')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'statistics' && { backgroundColor: colors.linkColor }]}
          onPress={() => setActiveTab('statistics')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'statistics' ? '#fff' : colors.textColor }]} numberOfLines={1}>{t('gamification.statistics')}</Text>
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
                <View style={[styles.profileCard, { backgroundColor: colors.isDark ? '#1e293b' : '#f3f4f6' }]}>
                  <Text style={styles.levelText}>{t('gamification.level')} {profile.level}</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={[styles.statNumber, { color: colors.textColor }]}>{profile.totalPoints}</Text>
                      <Text style={[styles.statLabel, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{t('gamification.points')}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statNumber, { color: colors.textColor }]}>{profile.totalRecordings}</Text>
                      <Text style={[styles.statLabel, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{t('gamification.recordings')}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={[styles.statNumber, { color: colors.textColor }]}>{profile.currentStreak}</Text>
                      <Text style={[styles.statLabel, { color: colors.isDark ? '#94a3b8' : '#6b7280' }]}>{t('gamification.dayStreak')}</Text>
                    </View>
                  </View>
                </View>
              )}
              <Text style={[styles.sectionTitle, { color: colors.textColor }]}>{t('gamification.achievements')}</Text>
            </View>
          )}
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={() => <Text style={[styles.emptyText, { color: colors.isDark ? '#555' : '#9ca3af' }]}>{t('gamification.noAchievements')}</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.linkColor} />
          }
        />
      ) : activeTab === 'leaderboard' ? (
        <FlatList
          data={leaderboard}
          keyExtractor={item => item.userId}
          renderItem={renderLeader}
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={() => <Text style={[styles.emptyText, { color: colors.isDark ? '#555' : '#9ca3af' }]}>{t('gamification.leaderboardUnavailable')}</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.linkColor} />
          }
        />
      ) : (
        renderStatistics()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
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
  tabText: {
    fontWeight: '600',
  },
  profileCard: {
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
  },
  statLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    paddingLeft: 4,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  achievementCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  achievementPoints: {
    color: '#fbbf24',
    fontSize: 14,
  },
  achievementDesc: {
    fontSize: 13,
    marginBottom: 8,
  },
  achievementDate: {
    fontSize: 12,
  },
  leaderCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontWeight: '700',
    fontSize: 16,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: '600',
  },
  leaderStats: {
    fontSize: 13,
    marginTop: 2,
  },
  leaderRecordings: {
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
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  className: {
    width: 80,
  },
  classBarContainer: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 10,
  },
  classBar: {
    height: '100%',
    borderRadius: 4,
  },
  classCount: {
    width: 40,
    textAlign: 'right',
  },
  recommendationBox: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderLeftWidth: 4,
  },
  recommendationTitle: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 14,
  },
  recentSection: {
    marginTop: 24,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  recentList: {
    marginTop: 4,
  },
  recentEmpty: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  recentItem: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recentDate: {
    marginLeft: 8,
    fontSize: 13,
  },
  recentDetail: {
    fontSize: 12,
    marginLeft: 26,
  },
});