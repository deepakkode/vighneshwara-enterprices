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

const VehiclesScreen = () => {
  const { getVehicles, addVehicle, updateVehicle, deleteVehicle, loading } = useApi();
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    vehicleType: '',
    driverName: '',
    driverPhone: '',
    capacity: '',
    status: 'active'
  });

  const loadVehicles = async () => {
    try {
      const data = await getVehicles();
      setVehicles(data);
      setFilteredVehicles(data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    const filtered = vehicles.filter(vehicle =>
      vehicle.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.vehicleType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.driverName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredVehicles(filtered);
  }, [searchQuery, vehicles]);

  const handleAddEdit = async () => {
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, formData);
      } else {
        await addVehicle(formData);
      }
      setDialogVisible(false);
      resetForm();
      loadVehicles();
    } catch (error) {
      Alert.alert('Error', 'Failed to save vehicle');
    }
  };

  const handleDelete = (vehicle) => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${vehicle.vehicleNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVehicle(vehicle.id);
              loadVehicles();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete vehicle');
            }
          },
        },
      ]
    );
  };

  const openDialog = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        vehicleNumber: vehicle.vehicleNumber || '',
        vehicleType: vehicle.vehicleType || '',
        driverName: vehicle.driverName || '',
        driverPhone: vehicle.driverPhone || '',
        capacity: vehicle.capacity?.toString() || '',
        status: vehicle.status || 'active'
      });
    } else {
      resetForm();
    }
    setDialogVisible(true);
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setFormData({
      vehicleNumber: '',
      vehicleType: '',
      driverName: '',
      driverPhone: '',
      capacity: '',
      status: 'active'
    });
  };

  const VehicleCard = ({ vehicle }) => (
    <Card style={styles.vehicleCard}>
      <Card.Content>
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleInfo}>
            <Title style={styles.vehicleNumber}>{vehicle.vehicleNumber}</Title>
            <Paragraph style={styles.vehicleType}>{vehicle.vehicleType}</Paragraph>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: vehicle.status === 'active' ? colors.success : colors.error 
          }]}>
            <Paragraph style={styles.statusText}>
              {vehicle.status?.toUpperCase()}
            </Paragraph>
          </View>
        </View>
        
        <View style={styles.vehicleDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="account" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>{vehicle.driverName || 'No driver assigned'}</Paragraph>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="phone" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>{vehicle.driverPhone || 'No phone'}</Paragraph>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="weight" size={16} color={colors.textSecondary} />
            <Paragraph style={styles.detailText}>
              Capacity: {vehicle.capacity ? `${vehicle.capacity} tons` : 'Not specified'}
            </Paragraph>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => openDialog(vehicle)}
            style={styles.actionButton}
          >
            Edit
          </Button>
          <Button
            mode="outlined"
            icon="delete"
            onPress={() => handleDelete(vehicle)}
            style={[styles.actionButton, { borderColor: colors.error }]}
            textColor={colors.error}
          >
            Delete
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && vehicles.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search vehicles..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />
      
      <FlatList
        data={filteredVehicles}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={({ item }) => <VehicleCard vehicle={item} />}
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
          <Dialog.Title>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Vehicle Number"
              value={formData.vehicleNumber}
              onChangeText={(text) => setFormData({...formData, vehicleNumber: text})}
              style={styles.input}
            />
            <TextInput
              label="Vehicle Type"
              value={formData.vehicleType}
              onChangeText={(text) => setFormData({...formData, vehicleType: text})}
              style={styles.input}
            />
            <TextInput
              label="Driver Name"
              value={formData.driverName}
              onChangeText={(text) => setFormData({...formData, driverName: text})}
              style={styles.input}
            />
            <TextInput
              label="Driver Phone"
              value={formData.driverPhone}
              onChangeText={(text) => setFormData({...formData, driverPhone: text})}
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              label="Capacity (tons)"
              value={formData.capacity}
              onChangeText={(text) => setFormData({...formData, capacity: text})}
              keyboardType="numeric"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddEdit} mode="contained">
              {editingVehicle ? 'Update' : 'Add'}
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
  vehicleCard: {
    marginBottom: 10,
    elevation: 2,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  vehicleType: {
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  vehicleDetails: {
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
    backgroundColor: colors.primary,
  },
  input: {
    marginBottom: 10,
  },
});

export default VehiclesScreen;