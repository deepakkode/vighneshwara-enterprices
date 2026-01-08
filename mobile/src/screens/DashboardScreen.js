import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useApi } from '../context/ApiContext';
import { colors } from '../theme/colors';

const DashboardScreen = ({ navigation }) => {
  const { getVehicles, getScrap, getExpenses, getBills, loading } = useApi();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    vehicles: 0,
    scrap: 0,
    expenses: 0,
    bills: 0,
    totalExpenseAmount: 0,
    totalBillAmount: 0,
  });

  const loadDashboardData = async () => {
    try {
      const [vehicles, scrap, expenses, bills] = await Promise.all([
        getVehicles(),
        getScrap(),
        getExpenses(),
        getBills(),
      ]);

      const totalExpenseAmount = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const totalBillAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);

      setStats({
        vehicles: vehicles.length,
        scrap: scrap.length,
        expenses: expenses.length,
        bills: bills.length,
        totalExpenseAmount,
        totalBillAmount,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <Card style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <Card.Content style={styles.statCardContent}>
        <View style={styles.statIcon}>
          <MaterialCommunityIcons name={icon} size={32} color={color} />
        </View>
        <View style={styles.statText}>
          <Title style={styles.statValue}>{value}</Title>
          <Paragraph style={styles.statTitle}>{title}</Paragraph>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Title style={styles.welcomeText}>Welcome to Vighneshwara Enterprises</Title>
        <Paragraph style={styles.subtitle}>Business Management Dashboard</Paragraph>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Vehicles"
          value={stats.vehicles}
          icon="truck"
          color={colors.primary}
          onPress={() => navigation.navigate('Vehicles')}
        />
        
        <StatCard
          title="Scrap Items"
          value={stats.scrap}
          icon="recycle"
          color={colors.secondary}
          onPress={() => navigation.navigate('Scrap')}
        />
        
        <StatCard
          title="Expenses"
          value={stats.expenses}
          icon="cash-multiple"
          color={colors.accent}
          onPress={() => navigation.navigate('Expenses')}
        />
        
        <StatCard
          title="Bills"
          value={stats.bills}
          icon="file-document"
          color={colors.warning}
          onPress={() => navigation.navigate('Bills')}
        />
      </View>

      <View style={styles.summarySection}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Title style={styles.summaryTitle}>Financial Summary</Title>
            <View style={styles.summaryRow}>
              <Paragraph style={styles.summaryLabel}>Total Expenses:</Paragraph>
              <Paragraph style={[styles.summaryValue, { color: colors.error }]}>
                ₹{stats.totalExpenseAmount.toLocaleString()}
              </Paragraph>
            </View>
            <View style={styles.summaryRow}>
              <Paragraph style={styles.summaryLabel}>Total Bills:</Paragraph>
              <Paragraph style={[styles.summaryValue, { color: colors.success }]}>
                ₹{stats.totalBillAmount.toLocaleString()}
              </Paragraph>
            </View>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.quickActions}>
        <Title style={styles.sectionTitle}>Quick Actions</Title>
        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            icon="plus"
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Vehicles')}
          >
            Add Vehicle
          </Button>
          <Button
            mode="contained"
            icon="plus"
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={() => navigation.navigate('Expenses')}
          >
            Add Expense
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 5,
  },
  statsGrid: {
    padding: 10,
  },
  statCard: {
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 2,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 15,
  },
  statText: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  statTitle: {
    color: colors.textSecondary,
  },
  summarySection: {
    padding: 10,
  },
  summaryCard: {
    elevation: 2,
  },
  summaryTitle: {
    color: colors.primary,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    color: colors.textSecondary,
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  quickActions: {
    padding: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.primary,
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 0.45,
  },
});

export default DashboardScreen;