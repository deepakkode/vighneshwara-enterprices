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

const BillsScreen = () => {
  const { getBills, addBill, updateBill, deleteBill, loading } = useApi();
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [formData, setFormData] = useState({
    billNumber: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: '',
    amount: '',
    paymentStatus: 'pending',
    paymentMethod: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: ''
  });

  const loadBills = async () => {
    try {
      const data = await getBills();
      setBills(data);
      setFilteredBills(data);
    } catch (error) {
      console.error('Error loading bills:', error);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  useEffect(() => {
    const filtered = bills.filter(bill =>
      bill.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.items?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredBills(filtered);
  }, [searchQuery, bills]);

  const handleAddEdit = async () => {
    try {
      const billData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
      };

      if (editingBill) {
        await updateBill(editingBill.id, billData);
      } else {
        await addBill(billData);
      }
      setDialogVisible(false);
      resetForm();
      loadBills();
    } catch (error) {
      Alert.alert('Error', 'Failed to save bill');
    }
  };

  const handleDelete = (bill) => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete bill ${bill.billNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBill(bill.id);
              loadBills();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete bill');
            }
          },
        },
      ]
    );
  };

  const openDialog = (bill = null) => {
    if (bill) {
      setEditingBill(bill);
      setFormData({
        billNumber: bill.billNumber || '',
        customerName: bill.customerName || '',
        customerPhone: bill.customerPhone || '',
        customerAddress: bill.customerAddress || '',
        items: bill.items || '',
        amount: bill.amount?.toString() || '',
        paymentStatus: bill.paymentStatus || 'pending',
        paymentMethod: bill.paymentMethod || '',
        date: bill.date || new Date().toISOString().split('T')[0],
        dueDate: bill.dueDate || '',
        notes: bill.notes || ''
      });
    } else {
      resetForm();
    }
    setDialogVisible(true);
  };

  const resetForm = () => {
    setEditingBill(null);
    setFormData({
      billNumber: '',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      items: '',
      amount: '',
      paymentStatus: 'pending',
      paymentMethod: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      notes: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return colors.success;
      case 'pending': return colors.warning;
      case 'overdue': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const BillCard = ({ bill }) => (
    <Card style={styles.billCard}>
      <Card.Content>
        <View style={styles.billHeader}>
          <View style={styles.billInfo}>
            <Title style={styles.billNumber}>#{bill.billNumber}</Title>
            <Paragraph style={styles.customerName}>{bill.customerName}</Paragraph>
          </View>
          <View style={styles.statusAmount}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bill.paymentStatus) }]}>
              <Paragraph style={styles.statusText}>
                {bill.paymentStatus?.toUpperCase() || 'PENDING'}
              </Paragraph>
            </View>
            <Paragraph style={styles.amountText}>
              ₹{bill.amount?.toLocaleString() || '0'}
            </Paragraph>
          </View>
        </View>
        
        <View style={styles.billDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="phone" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>
              {bill.customerPhone || 'No phone'}
            </Paragraph>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>
              {bill.customerAddress || 'No address'}
            </Paragraph>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="package-variant" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>
              {bill.items || 'No items specified'}
            </Paragraph>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>
              {bill.date ? new Date(bill.date).toLocaleDateString() : 'No date'}
            </Paragraph>
          </View>
          
          {bill.dueDate && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.error} />
              <Paragraph style={[styles.detailText, { color: colors.error }]}>
                Due: {new Date(bill.dueDate).toLocaleDateString()}
              </Paragraph>
            </View>
          )}
          
          {bill.paymentMethod && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="credit-card" size={16} color={colors.textSecondary} />
              <Paragraph style={styles.detailText}>{bill.paymentMethod}</Paragraph>
            </View>
          )}
          
          {bill.notes && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="note-text" size={16} color={colors.textSecondary} />
              <Paragraph style={styles.detailText}>{bill.notes}</Paragraph>
            </View>
          )}
        </View>
        
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => openDialog(bill)}
            style={styles.actionButton}
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            onPress={() => handleDelete(bill)}
            style={[styles.actionButton, { borderColor: colors.error }]}
            textColor={colors.error}
          >
            Delete
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && bills.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search bills..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />
      
      <FlatList
        data={filteredBills}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => <BillCard bill={item} />}
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
          <Dialog.Title>{editingBill ? 'Edit Bill' : 'Add Bill'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Bill Number"
              value={formData.billNumber}
              onChangeText={(text) => setFormData({...formData, billNumber: text})}
              style={styles.input}
            />
            <TextInput
              label="Customer Name"
              value={formData.customerName}
              onChangeText={(text) => setFormData({...formData, customerName: text})}
              style={styles.input}
            />
            <TextInput
              label="Customer Phone"
              value={formData.customerPhone}
              onChangeText={(text) => setFormData({...formData, customerPhone: text})}
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              label="Customer Address"
              value={formData.customerAddress}
              onChangeText={(text) => setFormData({...formData, customerAddress: text})}
              multiline={true}
              numberOfLines={2}
              style={styles.input}
            />
            <TextInput
              label="Items/Services"
              value={formData.items}
              onChangeText={(text) => setFormData({...formData, items: text})}
              multiline={true}
              numberOfLines={2}
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
              label="Notes (Optional)"
              value={formData.notes}
              onChangeText={(text) => setFormData({...formData, notes: text})}
              multiline={true}
              numberOfLines={2}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddEdit} mode="contained">
              {editingBill ? 'Update' : 'Add'}
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
  billCard: {
    marginBottom: 10,
    elevation: 2,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  billInfo: {
    flex: 1,
  },
  billNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.warning,
  },
  customerName: {
    color: colors.text,
    fontSize: 16,
  },
  statusAmount: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
  },
  statusText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
  },
  billDetails: {
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
    backgroundColor: colors.warning,
  },
  input: {
    marginBottom: 10,
  },
});

export default BillsScreen;