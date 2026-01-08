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

const ScrapScreen = () => {
  const { getScrap, addScrap, updateScrap, deleteScrap, loading } = useApi();
  const [scrapItems, setScrapItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    weight: '',
    pricePerKg: '',
    totalAmount: '',
    customerName: '',
    customerPhone: '',
    date: new Date().toISOString().split('T')[0]
  });

  const loadScrapItems = async () => {
    try {
      const data = await getScrap();
      setScrapItems(data);
      setFilteredItems(data);
    } catch (error) {
      console.error('Error loading scrap items:', error);
    }
  };

  useEffect(() => {
    loadScrapItems();
  }, []);

  useEffect(() => {
    const filtered = scrapItems.filter(item =>
      item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [searchQuery, scrapItems]);

  const handleAddEdit = async () => {
    try {
      const itemData = {
        ...formData,
        weight: parseFloat(formData.weight) || 0,
        pricePerKg: parseFloat(formData.pricePerKg) || 0,
        totalAmount: parseFloat(formData.totalAmount) || 0,
      };

      if (editingItem) {
        await updateScrap(editingItem.id, itemData);
      } else {
        await addScrap(itemData);
      }
      setDialogVisible(false);
      resetForm();
      loadScrapItems();
    } catch (error) {
      Alert.alert('Error', 'Failed to save scrap item');
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Delete Scrap Item',
      `Are you sure you want to delete ${item.itemName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScrap(item.id);
              loadScrapItems();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete scrap item');
            }
          },
        },
      ]
    );
  };

  const openDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        itemName: item.itemName || '',
        category: item.category || '',
        weight: item.weight?.toString() || '',
        pricePerKg: item.pricePerKg?.toString() || '',
        totalAmount: item.totalAmount?.toString() || '',
        customerName: item.customerName || '',
        customerPhone: item.customerPhone || '',
        date: item.date || new Date().toISOString().split('T')[0]
      });
    } else {
      resetForm();
    }
    setDialogVisible(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      itemName: '',
      category: '',
      weight: '',
      pricePerKg: '',
      totalAmount: '',
      customerName: '',
      customerPhone: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const ScrapCard = ({ item }) => (
    <Card style={styles.scrapCard}>
      <Card.Content>
        <View style={styles.scrapHeader}>
          <View style={styles.scrapInfo}>
            <Title style={styles.itemName}>{item.itemName}</Title>
            <Paragraph style={styles.category}>{item.category}</Paragraph>
          </View>
          <View style={styles.amountBadge}>
            <Paragraph style={styles.amountText}>
              ₹{item.totalAmount?.toLocaleString() || '0'}
            </Paragraph>
          </View>
        </View>
        
        <View style={styles.scrapDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="weight" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>
              {item.weight || 0} kg @ ₹{item.pricePerKg || 0}/kg
            </Paragraph>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="account" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>
              {item.customerName || 'No customer'}
            </Paragraph>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="phone" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>
              {item.customerPhone || 'No phone'}
            </Paragraph>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>
              {item.date ? new Date(item.date).toLocaleDateString() : 'No date'}
            </Paragraph>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => openDialog(item)}
            style={styles.actionButton}
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            onPress={() => handleDelete(item)}
            style={[styles.actionButton, { borderColor: colors.error }]}
            textColor={colors.error}
          >
            Delete
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && scrapItems.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search scrap items..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />
      
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => <ScrapCard item={item} />}
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
          <Dialog.Title>{editingItem ? 'Edit Scrap Item' : 'Add Scrap Item'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Item Name"
              value={formData.itemName}
              onChangeText={(text) => setFormData({...formData, itemName: text})}
              style={styles.input}
            />
            <TextInput
              label="Category"
              value={formData.category}
              onChangeText={(text) => setFormData({...formData, category: text})}
              style={styles.input}
            />
            <TextInput
              label="Weight (kg)"
              value={formData.weight}
              onChangeText={(text) => setFormData({...formData, weight: text})}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label="Price per Kg (₹)"
              value={formData.pricePerKg}
              onChangeText={(text) => setFormData({...formData, pricePerKg: text})}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label="Total Amount (₹)"
              value={formData.totalAmount}
              onChangeText={(text) => setFormData({...formData, totalAmount: text})}
              keyboardType="numeric"
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
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddEdit} mode="contained">
              {editingItem ? 'Update' : 'Add'}
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
  scrapCard: {
    marginBottom: 10,
    elevation: 2,
  },
  scrapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  scrapInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  category: {
    color: colors.textSecondary,
  },
  amountBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  amountText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrapDetails: {
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
    backgroundColor: colors.secondary,
  },
  input: {
    marginBottom: 10,
  },
});

export default ScrapScreen;