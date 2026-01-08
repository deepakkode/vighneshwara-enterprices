import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Image, StatusBar, ScrollView, Dimensions, Platform, Linking, Share } from 'react-native';
import { colors } from './src/theme/colors';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

// Get device dimensions for responsive design
const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// Calculate safe area padding based on device characteristics
const getSafeAreaPadding = () => {
  const aspectRatio = screenHeight / screenWidth;
  
  // Detect device type based on screen characteristics
  const isTablet = screenWidth >= 768;
  const isTallPhone = aspectRatio > 2.0; // Modern phones like iQOO 13, iPhone X series
  const isExtraTallPhone = aspectRatio > 2.15; // Very tall phones like iQOO 13
  const isRegularPhone = aspectRatio <= 2.0 && aspectRatio > 1.5;
  const hasGestureNavigation = screenHeight > 800; // Likely has gesture navigation
  
  let topPadding = 25; // Default
  let bottomPadding = 20; // Default
  
  if (Platform.OS === 'android') {
    if (isExtraTallPhone) {
      // Extra tall phones like iQOO 13, Xiaomi, OnePlus flagships
      topPadding = screenHeight > 900 ? 65 : 55;
      bottomPadding = hasGestureNavigation ? 55 : 45;
    } else if (isTallPhone) {
      // Tall phones like Samsung Galaxy S series
      topPadding = screenHeight > 900 ? 60 : 50;
      bottomPadding = hasGestureNavigation ? 50 : 40;
    } else if (isRegularPhone) {
      // Regular Android phones
      topPadding = 45;
      bottomPadding = hasGestureNavigation ? 40 : 30;
    } else if (isTablet) {
      // Android tablets
      topPadding = 35;
      bottomPadding = 25;
    }
  } else if (Platform.OS === 'ios') {
    if (isTallPhone) {
      // iPhone X series and newer (with notch/dynamic island)
      topPadding = 55;
      bottomPadding = 45;
    } else {
      // Older iPhones (with home button)
      topPadding = 25;
      bottomPadding = 20;
    }
  }
  
  return { topPadding, bottomPadding };
};

const { topPadding, bottomPadding } = getSafeAreaPadding();

// Debug log for development (can be removed later)
console.log(`Device Info: ${screenWidth}x${screenHeight}, Aspect: ${(screenHeight/screenWidth).toFixed(2)}, Platform: ${Platform.OS}`);
console.log(`Calculated Padding - Top: ${topPadding}, Bottom: ${bottomPadding}`);

/*
Universal Safe Area Solution:
- Detects device type based on screen dimensions and aspect ratio
- Automatically adjusts padding for different phone categories:
  * Extra tall phones (2.15+ ratio): iQOO 13, Xiaomi flagships, OnePlus
  * Tall phones (2.0+ ratio): Samsung Galaxy S series, most modern phones
  * Regular phones (1.5-2.0 ratio): Older Android phones
  * Tablets (768+ width): Android tablets
  * iOS devices: iPhone X series vs older iPhones
- Accounts for gesture navigation vs button navigation
- Provides minimum padding guarantees for edge cases
*/

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  // Pre-populate with their existing vehicles
  const [vehicles, setVehicles] = useState([
    { id: 1, name: 'Truck', type: 'Heavy Vehicle', driver: 'Driver 1' },
    { id: 2, name: 'Auto', type: 'Light Vehicle', driver: 'Driver 2' }
  ]);
  const [vehicleTransactions, setVehicleTransactions] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [transactionType, setTransactionType] = useState('income'); // 'income' or 'expense'

  const [scrapItems, setScrapItems] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // History filter state
  const [historyFilter, setHistoryFilter] = useState('All'); // 'All', 'Vehicle', 'Scrap', 'Expense'

  // Bill generation state
  const [currentBillData, setCurrentBillData] = useState(null);
  const [showBillView, setShowBillView] = useState(false);
  const billViewRef = useRef();

  // Form states
  const [transactionForm, setTransactionForm] = useState({ 
    description: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  const [scrapForm, setScrapForm] = useState({ item: '', weight: '', rate: '' });
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', date: '' });

  // Load data from backend on app start
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load vehicle transactions
      const vehicleTransactionsResponse = await fetch('http://10.162.58.180:3002/api/vehicles/transactions');
      if (vehicleTransactionsResponse.ok) {
        const vehicleTransactionsData = await vehicleTransactionsResponse.json();
        setVehicleTransactions(vehicleTransactionsData);
      }

      // Load scrap items
      const scrapResponse = await fetch('http://10.162.58.180:3002/api/scrap');
      if (scrapResponse.ok) {
        const scrapData = await scrapResponse.json();
        setScrapItems(scrapData);
      }

      // Load expenses
      const expensesResponse = await fetch('http://10.162.58.180:3002/api/expenses');
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json();
        setExpenses(expensesData);
      }

      console.log('All data loaded from backend');
    } catch (error) {
      console.log('Error loading data from backend:', error);
    }
  };

  const addVehicleTransaction = async () => {
    if (transactionForm.description && transactionForm.amount && selectedVehicle) {
      const transaction = {
        ...transactionForm,
        vehicleId: selectedVehicle.id,
        vehicleName: selectedVehicle.name,
        type: transactionType,
        id: Date.now()
      };
      
      // Add to local state
      setVehicleTransactions([...vehicleTransactions, transaction]);
      
      // Clear form fields immediately after adding to local state
      setTransactionForm({ 
        description: '', 
        amount: '', 
        date: new Date().toISOString().split('T')[0] // Reset to today's date
      });
      
      // Send to backend
      try {
        const response = await fetch('http://10.162.58.180:3002/api/vehicles/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction)
        });
        
        if (response.ok) {
          Alert.alert('Success', `${transactionType === 'income' ? 'Income' : 'Expense'} added successfully!`);
          // Reload data to ensure consistency
          loadAllData();
        } else {
          Alert.alert('Warning', `${transactionType === 'income' ? 'Income' : 'Expense'} saved locally, but failed to sync with server`);
        }
      } catch (error) {
        console.log('Backend not available, data saved locally');
        Alert.alert('Success', `${transactionType === 'income' ? 'Income' : 'Expense'} added successfully!`);
      }
    } else {
      Alert.alert('Error', 'Please fill all fields and select a vehicle');
    }
  };

  const addScrapItem = async () => {
    if (scrapForm.item && scrapForm.weight && scrapForm.rate) {
      const total = parseFloat(scrapForm.weight) * parseFloat(scrapForm.rate);
      const scrapItem = { ...scrapForm, total, id: Date.now() };
      
      // Add to local state
      setScrapItems([...scrapItems, scrapItem]);
      
      // Clear form fields immediately
      setScrapForm({ item: '', weight: '', rate: '' });
      
      // Send to backend
      try {
        const response = await fetch('http://10.162.58.180:3002/api/scrap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scrapItem)
        });
        
        if (response.ok) {
          Alert.alert('Success', 'Scrap item added successfully!');
          // Reload data to ensure consistency
          loadAllData();
        } else {
          Alert.alert('Warning', 'Scrap item saved locally, but failed to sync with server');
        }
      } catch (error) {
        console.log('Backend not available, data saved locally');
        Alert.alert('Success', 'Scrap item added successfully!');
      }
    } else {
      Alert.alert('Error', 'Please fill all fields');
    }
  };

  const addExpense = async () => {
    if (expenseForm.description && expenseForm.amount) {
      const expense = { ...expenseForm, id: Date.now() };
      
      // Add to local state
      setExpenses([...expenses, expense]);
      
      // Clear form fields immediately
      setExpenseForm({ description: '', amount: '', date: '' });
      
      // Send to backend
      try {
        const response = await fetch('http://10.162.58.180:3002/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expense)
        });
        
        if (response.ok) {
          Alert.alert('Success', 'Expense added successfully!');
          // Reload data to ensure consistency
          loadAllData();
        } else {
          Alert.alert('Warning', 'Expense saved locally, but failed to sync with server');
        }
      } catch (error) {
        console.log('Backend not available, data saved locally');
        Alert.alert('Success', 'Expense added successfully!');
      }
    } else {
      Alert.alert('Error', 'Please fill all required fields');
    }
  };

  const shareScrapBill = async (scrapItem) => {
    try {
      console.log('Starting bill generation for:', scrapItem.item);
      
      // Set the bill data and show the bill view
      setCurrentBillData(scrapItem);
      setShowBillView(true);
      
      // Wait longer for the view to render properly
      setTimeout(async () => {
        try {
          console.log('📸 Attempting to capture bill view...');
          
          if (!billViewRef.current) {
            throw new Error('Bill view reference not found');
          }
          
          // Capture the bill view as an image with better settings
          const uri = await captureRef(billViewRef.current, {
            format: 'png',
            quality: 0.8,
            result: 'tmpfile',
            height: 600,
            width: 400,
          });
          
          console.log('Bill captured successfully:', uri);
          
          // Hide the bill view
          setShowBillView(false);
          
          // Share the image
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/png',
              dialogTitle: 'Share Scrap Collection Receipt'
            });
            Alert.alert('Success', 'Bill image shared successfully!');
          } else {
            Alert.alert('Error', 'Sharing is not available on this device');
          }
          
        } catch (captureError) {
          console.log('Error capturing bill:', captureError);
          setShowBillView(false);
          Alert.alert('Error', `Failed to generate bill image: ${captureError.message}`);
        }
      }, 1500); // Increased timeout to 1.5 seconds
      
    } catch (error) {
      console.log('Error sharing bill:', error);
      setShowBillView(false);
      Alert.alert('Error', 'Unable to share bill. Please try again.');
    }
  };



  const renderDashboard = () => {
    // Calculate vehicle income/expenses
    const vehicleIncome = vehicleTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const vehicleExpenses = vehicleTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalProfit = vehicleIncome - vehicleExpenses - scrapItems.reduce((sum, item) => sum + (item.total || 0), 0) - expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    
    return (
      <ScrollView 
        style={styles.screen} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Business Overview</Text>
          <Text style={styles.welcomeSubtitle}>Financial performance and operations summary</Text>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={[styles.statCard, styles.vehicleCard]} onPress={() => setActiveTab('Vehicles')}>
            <Text style={styles.statNumber}>{vehicles.length}</Text>
            <Text style={styles.statLabel}>Active Vehicles</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.scrapCard]} onPress={() => setActiveTab('Scrap')}>
            <Text style={styles.statNumber}>{scrapItems.length}</Text>
            <Text style={styles.statLabel}>Scrap Purchases</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.statCard, styles.expenseCard]} onPress={() => setActiveTab('Expenses')}>
            <Text style={styles.statNumber}>{expenses.length}</Text>
            <Text style={styles.statLabel}>Expense Records</Text>
          </TouchableOpacity>
        </View>

        {/* Profit Overview */}
        <View style={styles.profitCard}>
          <View style={styles.profitHeader}>
            <Text style={styles.profitTitle}>Net Business Profit</Text>
          </View>
          <Text style={[styles.profitAmount, { color: totalProfit >= 0 ? colors.success : colors.error }]}>
            ₹{totalProfit.toLocaleString()}
          </Text>
          <Text style={styles.profitSubtext}>
            {totalProfit >= 0 ? 'Profitable Operations' : 'Review Expenses'}
          </Text>
        </View>

        {/* Financial Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Financial Summary</Text>
            <Text style={styles.summaryDate}>{new Date().toLocaleDateString()}</Text>
          </View>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Vehicle Income</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                +₹{vehicleIncome.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Vehicle Expenses</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                -₹{vehicleExpenses.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Scrap Purchases</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                -₹{scrapItems.reduce((sum, item) => sum + (item.total || 0), 0).toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>General Expenses</Text>
              <Text style={[styles.summaryValue, { color: colors.error }]}>
                -₹{expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab('Vehicles')}>
              <Text style={styles.quickActionText}>Vehicle Income</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab('Scrap')}>
              <Text style={styles.quickActionText}>Purchase Scrap</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab('Expenses')}>
              <Text style={styles.quickActionText}>Add Expense</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab('History')}>
              <Text style={styles.quickActionText}>View History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderVehicles = () => {
    const getVehicleBalance = (vehicleId) => {
      const transactions = vehicleTransactions.filter(t => t.vehicleId === vehicleId);
      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      return { income, expenses, balance: income - expenses };
    };

    return (
      <ScrollView 
        style={styles.screen} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.vehicleHeader}>
          <Text style={styles.vehicleTitle}>Vehicle Management</Text>
          <Text style={styles.vehicleSubtitle}>Track fleet income and expenses</Text>
        </View>

        {/* Vehicle Selection Cards */}
        <View style={styles.vehicleSelector}>
          <Text style={styles.sectionTitle}>Select Vehicle</Text>
          {vehicles.map((vehicle) => {
            const balance = getVehicleBalance(vehicle.id);
            const isSelected = selectedVehicle?.id === vehicle.id;
            return (
              <TouchableOpacity
                key={vehicle.id}
                style={[
                  styles.enhancedVehicleCard,
                  isSelected && styles.selectedEnhancedVehicleCard
                ]}
                onPress={() => setSelectedVehicle(vehicle)}
              >
                <View style={styles.vehicleCardHeader}>
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.enhancedVehicleName}>{vehicle.name}</Text>
                    <Text style={styles.vehicleType}>{vehicle.type}</Text>
                  </View>
                  <View style={styles.selectionIndicator}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </View>
                
                <View style={styles.vehicleBalanceSection}>
                  <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Net Balance</Text>
                    <Text style={[
                      styles.enhancedVehicleBalance,
                      { color: balance.balance >= 0 ? colors.success : colors.error }
                    ]}>
                      ₹{balance.balance.toLocaleString()}
                    </Text>
                  </View>
                  
                  <View style={styles.balanceBreakdown}>
                    <View style={styles.balanceItem}>
                      <Text style={styles.balanceText}>₹{balance.income.toLocaleString()}</Text>
                      <Text style={styles.balanceSubtext}>Income</Text>
                    </View>
                    <View style={styles.balanceItem}>
                      <Text style={styles.balanceText}>₹{balance.expenses.toLocaleString()}</Text>
                      <Text style={styles.balanceSubtext}>Expenses</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedVehicle && (
          <>
            {/* Transaction Type Toggle */}
            <View style={styles.enhancedToggleSection}>
              <Text style={styles.sectionTitle}>Transaction Type</Text>
              <View style={styles.enhancedToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.enhancedToggleButton,
                    transactionType === 'income' && styles.activeIncomeToggle
                  ]}
                  onPress={() => setTransactionType('income')}
                >
                  <Text style={[
                    styles.enhancedToggleText,
                    transactionType === 'income' && styles.activeToggleText
                  ]}>
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.enhancedToggleButton,
                    transactionType === 'expense' && styles.activeExpenseToggle
                  ]}
                  onPress={() => setTransactionType('expense')}
                >
                  <Text style={[
                    styles.enhancedToggleText,
                    transactionType === 'expense' && styles.activeToggleText
                  ]}>
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Enhanced Transaction Form */}
            <View style={styles.enhancedFormContainer}>
              <View style={styles.formHeader}>
                <Text style={styles.enhancedFormTitle}>
                  Add {transactionType === 'income' ? 'Income' : 'Expense'} for {selectedVehicle.name}
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {transactionType === 'income' ? 'Income' : 'Expense'} Description
                </Text>
                <TextInput
                  style={styles.enhancedInput}
                  placeholder={`Enter ${transactionType} description...`}
                  value={transactionForm.description}
                  onChangeText={(text) => setTransactionForm({...transactionForm, description: text})}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (₹)</Text>
                <TextInput
                  style={styles.enhancedInput}
                  placeholder="Enter amount..."
                  value={transactionForm.amount}
                  onChangeText={(text) => setTransactionForm({...transactionForm, amount: text})}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date</Text>
                <TextInput
                  style={styles.enhancedInput}
                  placeholder="YYYY-MM-DD"
                  value={transactionForm.date}
                  onChangeText={(text) => setTransactionForm({...transactionForm, date: text})}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.enhancedAddButton,
                  { backgroundColor: transactionType === 'income' ? colors.success : colors.error }
                ]} 
                onPress={addVehicleTransaction}
              >
                <Text style={styles.enhancedAddButtonText}>
                  Add {transactionType === 'income' ? 'Income' : 'Expense'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Enhanced Recent Transactions */}
            <View style={styles.enhancedTransactionsList}>
              <View style={styles.transactionsHeader}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <Text style={styles.vehicleNameBadge}>{selectedVehicle.name}</Text>
              </View>
              
              {vehicleTransactions
                .filter(t => t.vehicleId === selectedVehicle.id)
                .slice(-5)
                .reverse()
                .map((transaction) => (
                  <View key={transaction.id} style={styles.enhancedTransactionItem}>
                    <View style={styles.transactionLeft}>
                      <View style={[
                        styles.transactionTypeIndicator,
                        { backgroundColor: transaction.type === 'income' ? colors.success : colors.error }
                      ]}>
                      </View>
                      <View style={styles.transactionDetails}>
                        <Text style={styles.enhancedTransactionDesc}>{transaction.description}</Text>
                        <Text style={styles.enhancedTransactionDate}>{transaction.date}</Text>
                      </View>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[
                        styles.enhancedTransactionAmount,
                        { color: transaction.type === 'income' ? colors.success : colors.error }
                      ]}>
                        {transaction.type === 'income' ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              
              {vehicleTransactions.filter(t => t.vehicleId === selectedVehicle.id).length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No transactions yet</Text>
                  <Text style={styles.emptyStateSubtext}>Add your first transaction above</Text>
                </View>
              )}
            </View>
          </>
        )}

        {!selectedVehicle && (
          <View style={styles.selectVehiclePrompt}>
            <Text style={styles.promptText}>Select a vehicle above to manage transactions</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderScrap = () => (
    <ScrollView 
      style={styles.screen} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.scrapHeader}>
        <Text style={styles.scrapTitle}>Scrap Purchase Management</Text>
        <Text style={styles.scrapSubtitle}>Track scrap purchases and inventory</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.scrapStatsContainer}>
        <View style={styles.scrapStatCard}>
          <Text style={styles.scrapStatNumber}>{scrapItems.length}</Text>
          <Text style={styles.scrapStatLabel}>Items Purchased</Text>
        </View>
        
        <View style={styles.scrapStatCard}>
          <Text style={styles.scrapStatNumber}>
            {scrapItems.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0).toFixed(1)}kg
          </Text>
          <Text style={styles.scrapStatLabel}>Weight Purchased</Text>
        </View>
        
        <View style={styles.scrapStatCard}>
          <Text style={styles.scrapStatNumber}>
            ₹{scrapItems.reduce((sum, item) => sum + (item.total || 0), 0).toLocaleString()}
          </Text>
          <Text style={styles.scrapStatLabel}>Total Cost</Text>
        </View>
      </View>

      {/* Enhanced Form */}
      <View style={styles.enhancedScrapFormContainer}>
        <View style={styles.scrapFormHeader}>
          <Text style={styles.enhancedScrapFormTitle}>Purchase New Scrap Item</Text>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Item Name</Text>
          <TextInput
            style={styles.enhancedInput}
            placeholder="Enter scrap item name..."
            value={scrapForm.item}
            onChangeText={(text) => setScrapForm({...scrapForm, item: text})}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight (kg)</Text>
          <TextInput
            style={styles.enhancedInput}
            placeholder="Enter weight in kg..."
            value={scrapForm.weight}
            onChangeText={(text) => setScrapForm({...scrapForm, weight: text})}
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Rate per kg (₹)</Text>
          <TextInput
            style={styles.enhancedInput}
            placeholder="Enter rate per kg..."
            value={scrapForm.rate}
            onChangeText={(text) => setScrapForm({...scrapForm, rate: text})}
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Live Calculation Preview */}
        {scrapForm.weight && scrapForm.rate && (
          <View style={styles.calculationPreview}>
            <Text style={styles.calculationText}>
              Purchase Cost: ₹{(parseFloat(scrapForm.weight || 0) * parseFloat(scrapForm.rate || 0)).toLocaleString()}
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.enhancedScrapAddButton} 
          onPress={addScrapItem}
        >
          <Text style={styles.enhancedAddButtonText}>Purchase Scrap Item</Text>
        </TouchableOpacity>
      </View>

      {/* Enhanced Scrap Items List */}
      <View style={styles.enhancedScrapListContainer}>
        <View style={styles.scrapListHeader}>
          <Text style={styles.sectionTitle}>Scrap Inventory</Text>
          <View style={styles.sortBadge}>
            <Text style={styles.sortBadgeText}>Latest First</Text>
          </View>
        </View>
        
        {scrapItems.length > 0 ? (
          scrapItems
            .slice()
            .reverse()
            .map((item) => (
              <View key={item.id} style={styles.enhancedScrapItem}>
                <View style={styles.scrapItemLeft}>
                  <View style={styles.scrapItemIconContainer}>
                    <Text style={styles.scrapItemIcon}>S</Text>
                  </View>
                  <View style={styles.scrapItemDetails}>
                    <Text style={styles.enhancedScrapItemTitle}>{item.item}</Text>
                    <View style={styles.scrapItemMeta}>
                      <Text style={styles.scrapItemWeight}>{item.weight}kg</Text>
                      <Text style={styles.scrapItemRate}>₹{item.rate}/kg</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.scrapItemRight}>
                  <Text style={styles.enhancedScrapItemTotal}>
                    ₹{parseFloat(item.total || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.scrapItemPurchase}>Purchase</Text>
                  
                  {/* Share Bill Button */}
                  <TouchableOpacity 
                    style={styles.shareBillButton}
                    onPress={() => shareScrapBill(item)}
                  >
                    <Text style={styles.shareBillIcon}>Share</Text>
                    <Text style={styles.shareBillText}>Share Bill</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
        ) : (
          <View style={styles.emptyScrapState}>
            <Text style={styles.emptyStateIcon}>No Items</Text>
            <Text style={styles.emptyStateText}>No scrap items yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your first scrap item above to start tracking</Text>
          </View>
        )}
      </View>

      {/* Summary Card */}
      {scrapItems.length > 0 && (
        <View style={styles.scrapSummaryCard}>
          <View style={styles.summaryCardHeader}>
            <Text style={styles.summaryCardTitle}>Business Summary</Text>
            <Text style={styles.summaryCardDate}>{new Date().toLocaleDateString()}</Text>
          </View>
          
          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryMetricIcon}>Avg</Text>
              <Text style={styles.summaryMetricLabel}>Average Rate</Text>
              <Text style={styles.summaryMetricValue}>
                ₹{(scrapItems.reduce((sum, item) => sum + parseFloat(item.rate || 0), 0) / scrapItems.length).toFixed(0)}/kg
              </Text>
            </View>
            
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryMetricIcon}>Best</Text>
              <Text style={styles.summaryMetricLabel}>Best Item</Text>
              <Text style={styles.summaryMetricValue}>
                {scrapItems.reduce((best, item) => 
                  (item.total || 0) > (best.total || 0) ? item : best, scrapItems[0]
                )?.item || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderExpenses = () => {
    // Calculate expense statistics
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
    const thisMonthExpenses = expenses.filter(exp => {
      const expenseDate = new Date(exp.date || Date.now());
      const currentDate = new Date();
      return expenseDate.getMonth() === currentDate.getMonth() && 
             expenseDate.getFullYear() === currentDate.getFullYear();
    }).reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

    return (
      <ScrollView 
        style={styles.screen} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.expensesHeader}>
          <Text style={styles.expensesTitle}>Expense Management</Text>
          <Text style={styles.expensesSubtitle}>Track and control your business expenses</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.expensesStatsContainer}>
          <View style={styles.expenseStatCard}>
            <Text style={styles.expenseStatIcon}>Total</Text>
            <Text style={styles.expenseStatNumber}>{expenses.length}</Text>
            <Text style={styles.expenseStatLabel}>Total Entries</Text>
          </View>
          
          <View style={styles.expenseStatCard}>
            <Text style={styles.expenseStatIcon}>Amount</Text>
            <Text style={styles.expenseStatNumber}>₹{totalExpenses.toLocaleString()}</Text>
            <Text style={styles.expenseStatLabel}>Total Amount</Text>
          </View>
          
          <View style={styles.expenseStatCard}>
            <Text style={styles.expenseStatIcon}>Month</Text>
            <Text style={styles.expenseStatNumber}>₹{thisMonthExpenses.toLocaleString()}</Text>
            <Text style={styles.expenseStatLabel}>This Month</Text>
          </View>
        </View>

        {/* Enhanced Form */}
        <View style={styles.enhancedExpensesFormContainer}>
          <View style={styles.expensesFormHeader}>
            <Text style={styles.expensesFormHeaderIcon}>Add</Text>
            <Text style={styles.enhancedExpensesFormTitle}>Add New Expense</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Expense Description</Text>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Enter expense description..."
              value={expenseForm.description}
              onChangeText={(text) => setExpenseForm({...expenseForm, description: text})}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Enter expense amount..."
              value={expenseForm.amount}
              onChangeText={(text) => setExpenseForm({...expenseForm, amount: text})}
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date (Optional)</Text>
            <TextInput
              style={styles.enhancedInput}
              placeholder="YYYY-MM-DD or leave empty for today"
              value={expenseForm.date}
              onChangeText={(text) => setExpenseForm({...expenseForm, date: text})}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Expense Amount Preview */}
          {expenseForm.amount && (
            <View style={styles.expensePreview}>
              <Text style={styles.expensePreviewIcon}>Amount</Text>
              <Text style={styles.expensePreviewText}>
                Expense Amount: ₹{parseFloat(expenseForm.amount || 0).toLocaleString()}
              </Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.enhancedExpensesAddButton} 
            onPress={addExpense}
          >
            <Text style={styles.buttonIcon}>Add</Text>
            <Text style={styles.enhancedAddButtonText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Enhanced Expenses List */}
        <View style={styles.enhancedExpensesListContainer}>
          <View style={styles.expensesListHeader}>
            <Text style={styles.sectionTitle}>Expense History</Text>
            <View style={styles.expensesBadge}>
              <Text style={styles.expensesBadgeText}>Recent First</Text>
            </View>
          </View>
          
          {expenses.length > 0 ? (
            expenses
              .slice()
              .reverse()
              .map((expense) => (
                <View key={expense.id} style={styles.enhancedExpenseItem}>
                  <View style={styles.expenseItemLeft}>
                    <View style={styles.expenseItemIconContainer}>
                      <Text style={styles.expenseItemIcon}>E</Text>
                    </View>
                    <View style={styles.expenseItemDetails}>
                      <Text style={styles.enhancedExpenseItemTitle}>{expense.description}</Text>
                      <View style={styles.expenseItemMeta}>
                        <Text style={styles.expenseItemDate}>
                          {expense.date || new Date().toLocaleDateString()}
                        </Text>
                        <Text style={styles.expenseItemType}>Business</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.expenseItemRight}>
                    <Text style={styles.enhancedExpenseItemAmount}>
                      -₹{parseFloat(expense.amount || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.expenseItemStatus}>Paid</Text>
                  </View>
                </View>
              ))
          ) : (
            <View style={styles.emptyExpensesState}>
              <Text style={styles.emptyStateIcon}>No Expenses</Text>
              <Text style={styles.emptyStateText}>No expenses recorded</Text>
              <Text style={styles.emptyStateSubtext}>Add your first expense above to start tracking</Text>
            </View>
          )}
        </View>

        {/* Monthly Summary Card */}
        {expenses.length > 0 && (
          <View style={styles.expensesSummaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>Monthly Analysis</Text>
              <Text style={styles.summaryCardDate}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
            </View>
            
            <View style={styles.summaryMetrics}>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryMetricIcon}>Avg</Text>
                <Text style={styles.summaryMetricLabel}>Average Expense</Text>
                <Text style={styles.summaryMetricValue}>
                  ₹{averageExpense.toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryMetricIcon}>Max</Text>
                <Text style={styles.summaryMetricLabel}>Largest Expense</Text>
                <Text style={styles.summaryMetricValue}>
                  ₹{expenses.length > 0 ? Math.max(...expenses.map(e => parseFloat(e.amount || 0))).toLocaleString() : '0'}
                </Text>
              </View>
            </View>

            {/* Monthly Comparison */}
            <View style={styles.monthlyComparison}>
              <Text style={styles.comparisonTitle}>This Month vs Total</Text>
              <View style={styles.comparisonBar}>
                <View 
                  style={[
                    styles.comparisonFill, 
                    { width: totalExpenses > 0 ? `${(thisMonthExpenses / totalExpenses) * 100}%` : '0%' }
                  ]} 
                />
              </View>
              <Text style={styles.comparisonText}>
                {totalExpenses > 0 ? `${((thisMonthExpenses / totalExpenses) * 100).toFixed(1)}%` : '0%'} of total expenses
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };



  const renderBillView = () => {
    if (!currentBillData) return null;
    
    const billDate = new Date().toLocaleDateString('en-IN');
    const billTime = new Date().toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return (
      <View ref={billViewRef} style={styles.billContainer}>
        {/* Header */}
        <View style={styles.billHeader}>
          <Image 
            source={{ uri: 'https://i.postimg.cc/ydt4QLWV/logo-Photoroom.png' }}
            style={styles.billLogo}
            resizeMode="contain"
          />
          <Text style={styles.billCompanyName}>VIGHNESHWARA ENTERPRISES</Text>
          <Text style={styles.billReceiptType}>Scrap Purchase Receipt</Text>
        </View>
        
        {/* Receipt Info */}
        <View style={styles.billInfoSection}>
          <View style={styles.billInfoRow}>
            <Text style={styles.billInfoLabel}>Date:</Text>
            <Text style={styles.billInfoValue}>{billDate}</Text>
          </View>
          <View style={styles.billInfoRow}>
            <Text style={styles.billInfoLabel}>Time:</Text>
            <Text style={styles.billInfoValue}>{billTime}</Text>
          </View>
          <View style={styles.billInfoRow}>
            <Text style={styles.billInfoLabel}>Receipt #:</Text>
            <Text style={styles.billInfoValue}>VE{currentBillData.id}</Text>
          </View>
        </View>
        
        {/* Item Details */}
        <View style={styles.billSection}>
          <Text style={styles.billSectionTitle}>ITEM DETAILS</Text>
          <View style={styles.billItemRow}>
            <Text style={styles.billItemLabel}>Item:</Text>
            <Text style={styles.billItemValue}>{currentBillData.item}</Text>
          </View>
          <View style={styles.billItemRow}>
            <Text style={styles.billItemLabel}>Weight:</Text>
            <Text style={styles.billItemValue}>{currentBillData.weight} kg</Text>
          </View>
          <View style={styles.billItemRow}>
            <Text style={styles.billItemLabel}>Rate:</Text>
            <Text style={styles.billItemValue}>₹{currentBillData.rate}/kg</Text>
          </View>
        </View>
        
        {/* Total Amount */}
        <View style={styles.billTotalSection}>
          <Text style={styles.billTotalLabel}>TOTAL AMOUNT</Text>
          <Text style={styles.billTotalAmount}>₹{currentBillData.total}</Text>
        </View>
        
        {/* Payment Status */}
        <View style={styles.billStatusSection}>
          <View style={styles.billStatusRow}>
            <Text style={styles.billStatusLabel}>Payment Status:</Text>
            <Text style={styles.billStatusValue}>Paid</Text>
          </View>
          <View style={styles.billStatusRow}>
            <Text style={styles.billStatusLabel}>Transaction:</Text>
            <Text style={styles.billStatusValue}>Scrap Purchase</Text>
          </View>
        </View>
        
        {/* Footer */}
        <View style={styles.billFooter}>
          <Text style={styles.billFooterText}>Contact: Vighneshwara Enterprises</Text>
          <Text style={styles.billFooterText}>Thank you for your business!</Text>
          <Text style={styles.billFooterSmall}>This is a digital receipt</Text>
          <Text style={styles.billFooterSmall}>Generated: {billDate} {billTime}</Text>
        </View>
      </View>
    );
  };

  const renderHistory = () => {
    // Combine all data with timestamps for comprehensive history
    const allHistory = [];
    
    // Add vehicle transactions
    vehicleTransactions.forEach(transaction => {
      allHistory.push({
        ...transaction,
        category: 'Vehicle',
        categoryIcon: 'V',
        type: transaction.type,
        date: transaction.date,
        description: `${transaction.vehicleName}: ${transaction.description}`,
        amount: parseFloat(transaction.amount || 0),
        displayAmount: `${transaction.type === 'income' ? '+' : '-'}₹${parseFloat(transaction.amount || 0).toLocaleString()}`,
        color: transaction.type === 'income' ? colors.success : colors.error
      });
    });
    
    // Add scrap items
    scrapItems.forEach(item => {
      allHistory.push({
        ...item,
        category: 'Scrap',
        categoryIcon: 'S',
        type: 'expense',
        date: new Date(item.id).toISOString().split('T')[0], // Use ID timestamp as date
        description: `${item.item} (${item.weight}kg @ ₹${item.rate}/kg)`,
        amount: item.total || 0,
        displayAmount: `-₹${(item.total || 0).toLocaleString()}`,
        color: colors.error
      });
    });
    
    // Add expenses
    expenses.forEach(expense => {
      allHistory.push({
        ...expense,
        category: 'Expense',
        categoryIcon: 'E',
        type: 'expense',
        date: expense.date || new Date(expense.id).toISOString().split('T')[0],
        description: expense.description,
        amount: parseFloat(expense.amount || 0),
        displayAmount: `-₹${parseFloat(expense.amount || 0).toLocaleString()}`,
        color: colors.error
      });
    });
    
    // Filter history based on selected filter
    const filteredHistory = historyFilter === 'All' 
      ? allHistory 
      : allHistory.filter(item => item.category === historyFilter);
    
    // Sort by date (newest first)
    filteredHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Calculate totals by category
    const vehicleTotal = vehicleTransactions.reduce((sum, t) => {
      return sum + (t.type === 'income' ? parseFloat(t.amount || 0) : -parseFloat(t.amount || 0));
    }, 0);
    const scrapTotal = scrapItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const expenseTotal = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    
    return (
      <ScrollView 
        style={styles.screen} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Complete History</Text>
          <Text style={styles.historySubtitle}>View all your business transactions</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.historySummaryContainer}>
          <View style={styles.historySummaryCard}>
            <Text style={styles.historySummaryIcon}>V</Text>
            <Text style={styles.historySummaryLabel}>Vehicle Net</Text>
            <Text style={[
              styles.historySummaryAmount,
              { color: vehicleTotal >= 0 ? colors.success : colors.error }
            ]}>
              {vehicleTotal >= 0 ? '+' : ''}₹{vehicleTotal.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.historySummaryCard}>
            <Text style={styles.historySummaryIcon}>S</Text>
            <Text style={styles.historySummaryLabel}>Scrap Purchases</Text>
            <Text style={[styles.historySummaryAmount, { color: colors.error }]}>
              -₹{scrapTotal.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.historySummaryCard}>
            <Text style={styles.historySummaryIcon}>E</Text>
            <Text style={styles.historySummaryLabel}>Expenses</Text>
            <Text style={[styles.historySummaryAmount, { color: colors.error }]}>
              -₹{expenseTotal.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.historyFilterSection}>
          <Text style={styles.sectionTitle}>Filter by Category</Text>
          <View style={styles.filterButtonsContainer}>
            {['All', 'Vehicle', 'Scrap', 'Expense'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  historyFilter === filter && styles.activeFilterButton
                ]}
                onPress={() => setHistoryFilter(filter)}
              >
                <Text style={[
                  styles.filterButtonText,
                  historyFilter === filter && styles.activeFilterButtonText
                ]}>
                  {filter === 'All' && 'All'}
                  {filter === 'Vehicle' && 'V'}
                  {filter === 'Scrap' && 'S'}
                  {filter === 'Expense' && 'E'}
                  {' '}{filter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transaction Count */}
        <View style={styles.historyFilterContainer}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <Text style={styles.historyCount}>
            {filteredHistory.length} {historyFilter.toLowerCase()} transactions
          </Text>
        </View>

        {/* History List */}
        <View style={styles.historyListContainer}>
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item, index) => (
              <View key={`${item.category}-${item.id}-${index}`} style={styles.historyItem}>
                <View style={styles.historyItemLeft}>
                  <View style={[
                    styles.historyItemIconContainer,
                    { backgroundColor: `${item.color}20` }
                  ]}>
                    <Text style={styles.historyItemIcon}>{item.categoryIcon}</Text>
                  </View>
                  <View style={styles.historyItemDetails}>
                    <View style={styles.historyItemHeader}>
                      <Text style={styles.historyItemCategory}>{item.category}</Text>
                      <Text style={styles.historyItemDate}>{item.date}</Text>
                    </View>
                    <Text style={styles.historyItemDescription}>{item.description}</Text>
                  </View>
                </View>
                <View style={styles.historyItemRight}>
                  <Text style={[styles.historyItemAmount, { color: item.color }]}>
                    {item.displayAmount}
                  </Text>
                  <Text style={styles.historyItemType}>
                    {item.type === 'income' ? 'Income' : 'Expense'}
                  </Text>
                  
                  {/* Share Bill Button for Scrap Items */}
                  {item.category === 'Scrap' && (
                    <TouchableOpacity 
                      style={styles.historyShareButton}
                      onPress={() => shareScrapBill(item)}
                    >
                      <Text style={styles.historyShareIcon}>Share</Text>
                      <Text style={styles.historyShareText}>Bill</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyHistoryState}>
              <Text style={styles.emptyStateIcon}>No Data</Text>
              <Text style={styles.emptyStateText}>
                No {historyFilter.toLowerCase()} transactions
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {historyFilter === 'All' 
                  ? 'Start adding transactions to see your history'
                  : `Add ${historyFilter.toLowerCase()} transactions to see them here`
                }
              </Text>
            </View>
          )}
        </View>

        {/* Monthly Breakdown */}
        {filteredHistory.length > 0 && (
          <View style={styles.monthlyBreakdownCard}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownTitle}>Monthly Overview</Text>
              <Text style={styles.breakdownDate}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
            </View>
            
            <View style={styles.breakdownMetrics}>
              <View style={styles.breakdownMetric}>
                <Text style={styles.breakdownMetricIcon}>Month</Text>
                <Text style={styles.breakdownMetricLabel}>This Month</Text>
                <Text style={styles.breakdownMetricValue}>
                  {filteredHistory.filter(item => {
                    const itemDate = new Date(item.date);
                    const currentDate = new Date();
                    return itemDate.getMonth() === currentDate.getMonth() && 
                           itemDate.getFullYear() === currentDate.getFullYear();
                  }).length} transactions
                </Text>
              </View>
              
              <View style={styles.breakdownMetric}>
                <Text style={styles.breakdownMetricIcon}>Total</Text>
                <Text style={styles.breakdownMetricLabel}>
                  {historyFilter === 'All' ? 'Net Profit' : `${historyFilter} Total`}
                </Text>
                <Text style={[
                  styles.breakdownMetricValue,
                  { color: historyFilter === 'All' 
                    ? ((vehicleTotal - scrapTotal - expenseTotal) >= 0 ? colors.success : colors.error)
                    : (historyFilter === 'Vehicle' 
                      ? (vehicleTotal >= 0 ? colors.success : colors.error)
                      : (historyFilter === 'Scrap' ? colors.success : colors.error))
                  }
                ]}>
                  ₹{(historyFilter === 'All' 
                    ? (vehicleTotal - scrapTotal - expenseTotal)
                    : (historyFilter === 'Vehicle' 
                      ? vehicleTotal 
                      : (historyFilter === 'Scrap' ? scrapTotal : expenseTotal))
                  ).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'Dashboard': return renderDashboard();
      case 'Vehicles': return renderVehicles();
      case 'Scrap': return renderScrap();
      case 'Expenses': return renderExpenses();
      case 'History': return renderHistory();
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header with Logo */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image 
            source={{ uri: 'https://i.postimg.cc/ydt4QLWV/logo-Photoroom.png' }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Vighneshwara Enterprises</Text>
        </View>
      </View>

      {/* Top Tab Bar */}
      <View style={styles.tabBar}>
        {['Dashboard', 'Vehicles', 'Scrap', 'Expenses', 'History'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.activeTabButton
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.activeTabText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Screen Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>
      
      {/* Bill View Modal for Image Generation */}
      {showBillView && (
        <View style={styles.billModal}>
          <View style={styles.billModalOverlay}>
            <Text style={styles.billModalText}>Generating bill image...</Text>
            {renderBillView()}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: topPadding, // Dynamic top padding based on device
    paddingBottom: bottomPadding, // Dynamic bottom padding based on device
  },
  header: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logo: {
    width: 30,
    height: 30,
    marginRight: 12,
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    padding: 20,
    paddingBottom: Math.max(bottomPadding + 40, 60), // Ensure minimum 60px bottom padding
  },
  scrollContent: {
    paddingBottom: Math.max(bottomPadding + 20, 40), // Ensure minimum 40px scroll padding
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderTopWidth: 4,
    borderTopColor: colors.accent,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 5,
  },
  formContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: colors.background,
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
  },
  listItem: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 5,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: colors.secondary,
  },
  tabText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  vehicleSelector: {
    marginBottom: 20,
  },
  vehicleCard: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedVehicleCard: {
    borderColor: colors.secondary,
    backgroundColor: colors.cardTeal,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  vehicleBalance: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 5,
  },
  vehicleDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 5,
    marginBottom: 20,
    elevation: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeToggle: {
    backgroundColor: colors.secondary,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  activeToggleText: {
    color: 'white',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
  },
  transactionsList: {
    flex: 1,
  },
  transactionItem: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDesc: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Enhanced Dashboard Styles
  welcomeSection: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  statIcon: {
    marginBottom: 8,
  },
  statEmoji: {
    fontSize: 24,
  },
  vehicleCard: {
    borderLeftColor: colors.gradient.teal,
  },
  scrapCard: {
    borderLeftColor: colors.gradient.pink,
  },
  expenseCard: {
    borderLeftColor: colors.gradient.blue,
  },
  billCard: {
    borderLeftColor: colors.gradient.purple,
  },
  profitCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4.65,
    borderTopWidth: 4,
    borderTopColor: colors.success,
    alignItems: 'center',
  },
  profitHeader: {
    marginBottom: 10,
  },
  profitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  profitAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  profitSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickActionsCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderTopWidth: 4,
    borderTopColor: colors.secondary,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Enhanced Vehicle Page Styles
  vehicleHeader: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderLeftWidth: 4,
    borderLeftColor: colors.gradient.teal,
  },
  vehicleTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  vehicleSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  enhancedVehicleCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderWidth: 2,
    borderColor: colors.border,
  },
  selectedEnhancedVehicleCard: {
    borderColor: colors.secondary,
    backgroundColor: colors.cardTeal,
    elevation: 5,
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  vehicleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  vehicleIcon: {
    fontSize: 24,
  },
  vehicleInfo: {
    flex: 1,
  },
  enhancedVehicleName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  vehicleType: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectionIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  vehicleBalanceSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 15,
  },
  balanceCard: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  enhancedVehicleBalance: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  balanceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  balanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  balanceIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  balanceSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  enhancedToggleSection: {
    marginBottom: 20,
  },
  enhancedToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 5,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  enhancedToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeIncomeToggle: {
    backgroundColor: colors.success,
  },
  activeExpenseToggle: {
    backgroundColor: colors.error,
  },
  toggleIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  enhancedToggleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  enhancedFormContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  formHeaderIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  enhancedFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  enhancedInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
  },
  enhancedAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  enhancedAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  enhancedTransactionsList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  vehicleNameBadge: {
    backgroundColor: colors.secondary,
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    fontSize: 12,
    fontWeight: 'bold',
  },
  enhancedTransactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionTypeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  transactionTypeIcon: {
    fontSize: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  enhancedTransactionDesc: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  enhancedTransactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  enhancedTransactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectVehiclePrompt: {
    backgroundColor: colors.surface,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
  },
  promptIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  promptText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Enhanced Scrap Page Styles
  scrapHeader: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderLeftWidth: 4,
    borderLeftColor: colors.gradient.pink,
  },
  scrapTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  scrapSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrapStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  scrapStatCard: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 12,
    width: '31%',
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderTopWidth: 3,
    borderTopColor: colors.gradient.pink,
  },
  scrapStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  scrapStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  scrapStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  enhancedScrapFormContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  scrapFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrapFormHeaderIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  enhancedScrapFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  calculationPreview: {
    backgroundColor: colors.cardPink,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.gradient.pink,
  },
  calculationIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  calculationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  enhancedScrapAddButton: {
    backgroundColor: colors.gradient.pink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
  },
  enhancedScrapListContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  scrapListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortBadge: {
    backgroundColor: colors.gradient.pink,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  sortBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  enhancedScrapItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scrapItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scrapItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardPink,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  scrapItemIcon: {
    fontSize: 16,
  },
  scrapItemDetails: {
    flex: 1,
  },
  enhancedScrapItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  scrapItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrapItemWeight: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 15,
  },
  scrapItemRate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scrapItemRight: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  enhancedScrapItemTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gradient.pink,
    marginBottom: 2,
  },
  scrapItemPurchase: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  emptyScrapState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  scrapSummaryCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderTopWidth: 4,
    borderTopColor: colors.gradient.pink,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  summaryCardDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryMetric: {
    alignItems: 'center',
    flex: 1,
  },
  summaryMetricIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryMetricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  // Enhanced Expenses Page Styles
  expensesHeader: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderLeftWidth: 4,
    borderLeftColor: colors.gradient.blue,
  },
  expensesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  expensesSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  expensesStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  expenseStatCard: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 12,
    width: '31%',
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderTopWidth: 3,
    borderTopColor: colors.gradient.blue,
  },
  expenseStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  expenseStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  expenseStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  enhancedExpensesFormContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  expensesFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  expensesFormHeaderIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  enhancedExpensesFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
  },
  expensePreview: {
    backgroundColor: colors.cardBlue,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.gradient.blue,
  },
  expensePreviewIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  expensePreviewText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  enhancedExpensesAddButton: {
    backgroundColor: colors.gradient.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
  },
  enhancedExpensesListContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  expensesListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  expensesBadge: {
    backgroundColor: colors.gradient.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  expensesBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  enhancedExpenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  expenseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  expenseItemIcon: {
    fontSize: 16,
  },
  expenseItemDetails: {
    flex: 1,
  },
  enhancedExpenseItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  expenseItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseItemDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 15,
  },
  expenseItemType: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  expenseItemRight: {
    alignItems: 'flex-end',
  },
  enhancedExpenseItemAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 2,
  },
  expenseItemStatus: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  emptyExpensesState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  expensesSummaryCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderTopWidth: 4,
    borderTopColor: colors.gradient.blue,
  },
  monthlyComparison: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  comparisonBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  comparisonFill: {
    height: '100%',
    backgroundColor: colors.gradient.blue,
    borderRadius: 4,
  },
  comparisonText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // History Page Styles
  historyHeader: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  historyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  historySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  historySummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  historySummaryCard: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 12,
    width: '31%',
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderTopWidth: 3,
    borderTopColor: colors.secondary,
  },
  historySummaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  historySummaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  historySummaryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  historyFilterContainer: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  historyListContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  historyItemIcon: {
    fontSize: 16,
  },
  historyItemDetails: {
    flex: 1,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyItemCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  historyItemDate: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  historyItemDescription: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  historyItemType: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  emptyHistoryState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  monthlyBreakdownCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderTopWidth: 4,
    borderTopColor: colors.accent,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  breakdownDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  breakdownMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breakdownMetric: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownMetricIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  breakdownMetricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  breakdownMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  // Filter Button Styles
  historyFilterSection: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  filterButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
  },
  activeFilterButton: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  activeFilterButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Share Bill Button Styles
  shareBillButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  shareBillIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  shareBillText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // History Share Button Styles
  historyShareButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 6,
    elevation: 1,
  },
  historyShareIcon: {
    fontSize: 10,
    marginRight: 3,
  },
  historyShareText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  // Bill Image Styles
  billModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  billModalOverlay: {
    alignItems: 'center',
  },
  billModalText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  billContainer: {
    width: 400,
    height: 600,
    backgroundColor: 'white',
    padding: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  billHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  billLogo: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  billLogo: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  billCompanyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  billReceiptType: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  billInfoSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  billInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billInfoLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  billInfoValue: {
    fontSize: 12,
    color: colors.text,
  },
  billSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  billSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billItemLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  billItemValue: {
    fontSize: 12,
    color: colors.text,
  },
  billTotalSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: colors.cardTeal,
    borderRadius: 8,
  },
  billTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  billTotalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  billStatusSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  billStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billStatusLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  billStatusValue: {
    fontSize: 12,
    color: colors.success,
    fontWeight: 'bold',
  },
  billFooter: {
    alignItems: 'center',
  },
  billFooterText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  billFooterSmall: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 2,
  },
});