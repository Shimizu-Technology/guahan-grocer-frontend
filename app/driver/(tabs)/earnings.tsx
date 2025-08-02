import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../../context/AuthContext';
import { driverStatsAPI } from '../../../services/api';

interface EarningsData {
  totalEarnings: number;
  basePay: number;
  tips: number;
  bonuses: number;
  expenses: number;
  deliveries: number;
  hoursOnline: number;
  acceptanceRate: number;
  avgRating: number | null;
}

interface DailyEarnings {
  date: string;
  earnings: number;
  deliveries: number;
}

type PeriodType = 'today' | 'week' | 'month';

const { width } = Dimensions.get('window');

export default function DriverEarnings() {
  const { user } = useAuth();
  const [currentPeriod, setCurrentPeriod] = useState<PeriodType>('today');
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    basePay: 0,
    tips: 0,
    bonuses: 0,
    expenses: 0,
    deliveries: 0,
    hoursOnline: 0,
    acceptanceRate: 0,
    avgRating: null,
  });
  const [weeklyData, setWeeklyData] = useState<DailyEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Goals (could be stored in user preferences later)
  const [dailyGoal] = useState(100);
  const [weeklyGoal] = useState(600);
  const [monthlyGoal] = useState(2400);

  const fetchEarningsData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      
      if (currentPeriod === 'today') {
        // Fetch today's stats
        const statsResponse = await driverStatsAPI.getStatsForDate(today);
        if (statsResponse.data) {
          const stats = statsResponse.data as any;
          setEarningsData({
            totalEarnings: stats.totalEarnings || 0,
            basePay: stats.basePay || 0, // Real base pay from orders
            tips: stats.tips || 0, // Real tips from orders
            bonuses: stats.bonuses || 0, // Real bonuses (when implemented)
            expenses: stats.expenses || 0, // Real expenses (when tracked)
            deliveries: stats.totalDeliveries || 0,
            hoursOnline: stats.hoursOnline || 0, // Real hours online (when tracked)
            acceptanceRate: stats.acceptanceRate || 0, // Real acceptance rate
            avgRating: stats.averageRating || null, // Real rating (when implemented)
          });
        }
      } else if (currentPeriod === 'week') {
        // Generate mock weekly data (would normally fetch from API)
        const weekData: DailyEarnings[] = [];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 6); // Last 7 days

        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          
          // Mock earnings data (in real app, fetch from API)
          const earnings = Math.random() * 150 + 50; // $50-200 per day
          const deliveries = Math.floor(Math.random() * 15) + 5; // 5-20 deliveries
          
          weekData.push({
            date: date.toISOString().split('T')[0],
            earnings: Math.round(earnings * 100) / 100,
            deliveries,
          });
        }
        
        setWeeklyData(weekData);
        
        // Calculate week totals
        const weekTotalEarnings = weekData.reduce((sum, day) => sum + day.earnings, 0);
        const weekTotalDeliveries = weekData.reduce((sum, day) => sum + day.deliveries, 0);
        
        setEarningsData({
          totalEarnings: weekTotalEarnings,
          basePay: weekTotalEarnings * 0.7,
          tips: weekTotalEarnings * 0.25,
          bonuses: weekTotalEarnings * 0.05,
          expenses: 15.50 * 7,
          deliveries: weekTotalDeliveries,
          hoursOnline: 40, // Mock: 40 hours per week
          acceptanceRate: 85,
          avgRating: 4.8,
        });
      } else {
        // Month view (mock data)
        setEarningsData({
          totalEarnings: 2150.75,
          basePay: 1505.53,
          tips: 537.69,
          bonuses: 107.54,
          expenses: 465.00, // $15.50 * 30 days
          deliveries: 87,
          hoursOnline: 160, // Mock: 160 hours per month
          acceptanceRate: 87,
          avgRating: 4.8,
        });
      }

    } catch (err) {
      console.error('Failed to fetch earnings data:', err);
      setError('Failed to load earnings data. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, [currentPeriod]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEarningsData(false);
    setRefreshing(false);
  };

  const getGoalProgress = () => {
    switch (currentPeriod) {
      case 'today':
        return (earningsData.totalEarnings / dailyGoal) * 100;
      case 'week':
        return (earningsData.totalEarnings / weeklyGoal) * 100;
      case 'month':
        return (earningsData.totalEarnings / monthlyGoal) * 100;
      default:
        return 0;
    }
  };

  const getCurrentGoal = () => {
    switch (currentPeriod) {
      case 'today':
        return dailyGoal;
      case 'week':
        return weeklyGoal;
      case 'month':
        return monthlyGoal;
      default:
        return 0;
    }
  };

  const getPeriodLabel = () => {
    switch (currentPeriod) {
      case 'today':
        return "Today's";
      case 'week':
        return "This Week's";
      case 'month':
        return "This Month's";
      default:
        return '';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  const renderWeeklyChart = () => {
    if (currentPeriod !== 'week' || weeklyData.length === 0) return null;

    const maxEarnings = Math.max(...weeklyData.map(d => d.earnings));
    const chartHeight = 120;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Daily Earnings This Week</Text>
        <View style={styles.chartArea}>
          <View style={styles.chart}>
            {weeklyData.map((day, index) => (
              <View key={day.date} style={styles.chartColumn}>
                <View 
                  style={[
                    styles.chartBar, 
                    { 
                      height: (day.earnings / maxEarnings) * chartHeight,
                      backgroundColor: index === 6 ? '#0F766E' : '#A7F3D0' // Today is darker
                    }
                  ]} 
                />
                <Text style={styles.chartBarLabel}>{formatDate(day.date)}</Text>
                <Text style={styles.chartBarValue}>${day.earnings.toFixed(0)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingText}>Loading earnings data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchEarningsData()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const goalProgress = getGoalProgress();
  const currentGoal = getCurrentGoal();

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Earnings</Text>
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="download" size={20} color="#0F766E" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {[
              { key: 'today' as PeriodType, label: 'Today' },
              { key: 'week' as PeriodType, label: 'Week' },
              { key: 'month' as PeriodType, label: 'Month' },
            ].map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  currentPeriod === period.key && styles.periodButtonActive
                ]}
                onPress={() => setCurrentPeriod(period.key)}
              >
                <Text style={[
                  styles.periodButtonText,
                  currentPeriod === period.key && styles.periodButtonTextActive
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Earnings Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{getPeriodLabel()} Breakdown</Text>
            
            {/* Total Earnings Card */}
            <View style={styles.totalEarningsCard}>
              <View style={styles.totalEarningsHeader}>
                <View>
                  <Text style={styles.totalEarningsLabel}>Total Earnings</Text>
                  <Text style={styles.totalEarningsAmount}>
                    ${earningsData.totalEarnings.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.netEarningsInfo}>
                  <Text style={styles.netEarningsLabel}>Net Earnings</Text>
                  <Text style={styles.netEarningsAmount}>
                    ${earningsData.totalEarnings.toFixed(2)}
                  </Text>
                </View>
              </View>
              
              {/* Goal Progress */}
              <View style={styles.goalSection}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalLabel}>Goal Progress</Text>
                  <Text style={styles.goalText}>
                    ${earningsData.totalEarnings.toFixed(0)} / ${currentGoal}
                  </Text>
                </View>
                <View style={styles.goalProgressBar}>
                  <View 
                    style={[
                      styles.goalProgressFill, 
                      { width: `${Math.min(goalProgress, 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.goalPercentage}>
                  {goalProgress.toFixed(0)}% complete
                </Text>
              </View>
            </View>

            {/* Breakdown Cards */}
            <View style={styles.breakdownGrid}>
              <View style={styles.breakdownCard}>
                <Ionicons name="cash" size={24} color="#0F766E" />
                <Text style={styles.breakdownValue}>${earningsData.basePay.toFixed(2)}</Text>
                <Text style={styles.breakdownLabel}>Base Pay</Text>
              </View>
              <View style={styles.breakdownCard}>
                <Ionicons name="heart" size={24} color="#DC2626" />
                <Text style={styles.breakdownValue}>${earningsData.tips.toFixed(2)}</Text>
                <Text style={styles.breakdownLabel}>Tips</Text>
              </View>
              <View style={styles.breakdownCard}>
                <Ionicons name="analytics" size={24} color="#7C3AED" />
                <Text style={styles.breakdownValue}>
                  ${(earningsData.totalEarnings / Math.max(earningsData.deliveries, 1)).toFixed(2)}
                </Text>
                <Text style={styles.breakdownLabel}>Avg per Order</Text>
              </View>
              <View style={styles.breakdownCard}>
                <Ionicons name="bag" size={24} color="#EA580C" />
                <Text style={styles.breakdownValue}>{earningsData.deliveries}</Text>
                <Text style={styles.breakdownLabel}>Total Deliveries</Text>
              </View>
            </View>
          </View>

          {/* Weekly Chart */}
          {renderWeeklyChart()}





          {/* Action Buttons */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="document-text" size={20} color="#0F766E" />
              <Text style={styles.actionButtonText}>Download Statement</Text>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="calculator" size={20} color="#0F766E" />
              <Text style={styles.actionButtonText}>Tax Information</Text>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="settings" size={20} color="#0F766E" />
              <Text style={styles.actionButtonText}>Earnings Settings</Text>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  exportButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  // Period Selector
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#0F766E',
    fontWeight: '600',
  },
  // Total Earnings Card
  totalEarningsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  totalEarningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  totalEarningsLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  totalEarningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0F766E',
  },
  netEarningsInfo: {
    alignItems: 'flex-end',
  },
  netEarningsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  netEarningsAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  // Goal Progress
  goalSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  goalText: {
    fontSize: 14,
    color: '#6B7280',
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#0F766E',
    borderRadius: 4,
  },
  goalPercentage: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Breakdown Grid
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  breakdownCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Chart Styles
  chartContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartArea: {
    alignItems: 'center',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: 8,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartBar: {
    width: '80%',
    minHeight: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  chartBarLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  chartBarValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0F766E',
  },
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F766E',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Quick Stats
  quickStatsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickStatLabel: {
    fontSize: 14,
    color: '#1F2937',
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F766E',
  },
  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
});