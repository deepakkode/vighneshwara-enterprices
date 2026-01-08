import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  FAB, 
  ActivityIndicator, 
  Searchbar,
  Button,
  Dialog,
  Portal,
  TextInput
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useApi } from '../context/ApiContext';
import { colors } from '../theme/colors';

const ExpensesScreen = () => {
  const { getExpenses, addExpense, updateExpense, deleteExpense, loading } = useApi();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    amount: '',
    paymentMethod: '',
    vehicleNumber: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const loadExpenses = async () => {
    try {
      const data = await getExpenses();
      setExpenses(data);
      setFilteredExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  useEffect(() => {
    const filtered = expenses.filter(expense =>
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredExpenses(filtered);
  }, [searchQuery, expenses]);

  const handleAddEdit = async () => {
    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData);
      } else {
        await addExpense(expenseData);
      }
      setDialogVisible(false);
      resetForm();
      loadExpenses();
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense');
    }
  };

  const handleDelete = (expense) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete this expense?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
              loadExpenses();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const openDialog = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        description: expense.description || '',
        category: expense.category || '',
        amount: expense.amount?.toString() || '',
        paymentMethod: expense.paymentMethod || '',
        vehicleNumber: expense.vehicleNumber || '',
        date: expense.date || new Date().toISOString().split('T')[0],
        notes: expense.notes || ''
      });
    } else {
      resetForm();
    }
    setDialogVisible(true);
  };

  const resetForm = () => {
    setEditingExpense(null);
    setFormData({
      description: '',
      category: '',
      amount: '',
      paymentMethod: '',
      vehicleNumber: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'fuel': return 'gas-station';
      case 'maintenance': return 'wrench';
      case 'salary': return 'account-cash';
      case 'office': return 'office-building';
      case 'transport': return 'truck';
      default: return 'cash';
    }
  };

  const ExpenseCard = ({ expense }) => (
    <Card style={styles.expenseCard}>
      <Card.Content>
        <View style={styles.expenseHeader}>
          <View style={styles.expenseInfo}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons 
                name={getCategoryIcon(expense.category)} 
                size={20} 
                color={colors.accent} 
              />
              <Title style={styles.description}>{expense.description}</Title>
            </View>
            <Paragraph style={styles.category}>{expense.category}</Paragraph>
          </View>
          <View style={styles.amountBadge}>
            <Paragraph style={styles.amountText}>
              ₹{expense.amount?.toLocaleString() || '0'}
            </Paragraph>
          </View>
        </View>
        
        <View style={styles.expenseDetails}>
          {expense.vehicleNumber && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="truck" size={16} color={colors.textSecondary} />
              <Paragraph style={styles.detailText}>{expense.vehicleNumber}</Paragraph>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="credit-card" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>
              {expense.paymentMethod || 'Cash'}
            </Paragraph>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>
              {expense.date ? new Date(expense.date).toLocaleDateString() : 'No date'}
            </Paragraph>
          </View>
          
          {expense.notes && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="note-text" size={16} color={colors.textSecondary} />
              <Paragraph style={styles.detailText}>{expense.notes}</Paragraph>
            </View>
          )}
        </View>
        
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => openDialog(expense)}
            style={styles.actionButton}
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            onPress={() => handleDelete(expense)}
            style={[styles.actionButton, { borderColor: colors.error }]}
            textColor={colors.error}
          >
            Delete
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && expenses.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search expenses..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />
      
      <FlatList
        data={filteredExpenses}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => <ExpenseCard expense={item} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => openDialog()}
        color={colors.surface}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{editingExpense ? 'Edit Expense' : 'Add Expense'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Description"
              value={formData.description}
              onChangeText={(text) => setFormData({...formData, description: text})}
              style={styles.input}
            />
            <TextInput
              label="Category"
              value={formData.category}
              onChangeText={(text) => setFormData({...formData, category: text})}
              style={styles.input}
            />
            <TextInput
              label="Amount (₹)"
              value={formData.amount}
              onChangeText={(text) => setFormData({...formData, amount: text})}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label="Payment Method"
              value={formData.paymentMethod}
              onChangeText={(text) => setFormData({...formData, paymentMethod: text})}
              style={styles.input}
            />
            <TextInput
              label="Vehicle Number (Optional)"
              value={formData.vehicleNumber}
              onChangeText={(text) => setFormData({...formData, vehicleNumber: text})}
              style={styles.input}
            />
            <TextInput
              label="Notes (Optional)"
              value={formData.notes}
              onChangeText={(text) => setFormData({...formData, notes: text})}
              multiline={true}
              numberOfLines={3}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddEdit} mode="contained">
              {editingExpense ? 'Update' : 'Add'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
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
  },
  searchbar: {
    margin: 10,
    elevation: 2,
  },
  listContainer: {
    padding: 10,
    paddingBottom: 80,
  },
  expenseCard: {
    marginBottom: 10,
    elevation: 2,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  expenseInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  description: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent,
    marginLeft: 8,
    flex: 1,
  },
  category: {
    color: colors.textSecondary,
    marginLeft: 28,
  },
  amountBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  amountText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  expenseDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    marginLeft: 8,
    color: colors.text,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 0.45,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.accent,
  },
  input: {
    marginBottom: 10,
  },
});

export default ExpensesScreen;