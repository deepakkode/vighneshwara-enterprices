import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

// Simple screen components without React Native Paper
const DashboardScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Dashboard</Text>
    <Text style={styles.subtitle}>Welcome to Vighneshwara Enterprises</Text>
  </View>
);

const VehiclesScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Vehicles</Text>
    <Text style={styles.subtitle}>Manage your vehicles</Text>
  </View>
);

const ScrapScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Scrap</Text>
    <Text style={styles.subtitle}>Manage scrap items</Text>
  </View>
);

const ExpensesScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Expenses</Text>
    <Text style={styles.subtitle}>Track your expenses</Text>
  </View>
);

const BillsScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.title}>Bills</Text>
    <Text style={styles.subtitle}>Manage your bills</Text>
  </View>
);

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            switch (route.name) {
              case 'Dashboard':
                iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
                break;
              case 'Vehicles':
                iconName = focused ? 'truck' : 'truck-outline';
                break;
              case 'Scrap':
                iconName = focused ? 'recycle' : 'recycle-variant';
                break;
              case 'Expenses':
                iconName = focused ? 'cash-multiple' : 'cash-multiple';
                break;
              case 'Bills':
                iconName = focused ? 'file-document' : 'file-document-outline';
                break;
              default:
                iconName = 'circle';
            }

            return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#25D366',
          tabBarInactiveTintColor: '#666666',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E0E0E0',
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          headerStyle: {
            backgroundColor: '#25D366',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{ title: 'Dashboard' }}
        />
        <Tab.Screen 
          name="Vehicles" 
          component={VehiclesScreen}
          options={{ title: 'Vehicles' }}
        />
        <Tab.Screen 
          name="Scrap" 
          component={ScrapScreen}
          options={{ title: 'Scrap' }}
        />
        <Tab.Screen 
          name="Expenses" 
          component={ExpensesScreen}
          options={{ title: 'Expenses' }}
        />
        <Tab.Screen 
          name="Bills" 
          component={BillsScreen}
          options={{ title: 'Bills' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#25D366',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

export default AppNavigator;