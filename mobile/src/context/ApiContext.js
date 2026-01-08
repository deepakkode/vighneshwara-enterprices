import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const ApiContext = createContext();

const API_BASE_URL = 'http://10.162.58.180:3001/api';

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

export const ApiProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = async (method, endpoint, data = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const config = {
        method,
        url: `${API_BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || 'An error occurred');
      throw err;
    }
  };

  // API methods
  const api = {
    // Vehicles
    getVehicles: () => apiCall('GET', '/vehicles'),
    addVehicle: (vehicle) => apiCall('POST', '/vehicles', vehicle),
    updateVehicle: (id, vehicle) => apiCall('PUT', `/vehicles/${id}`, vehicle),
    deleteVehicle: (id) => apiCall('DELETE', `/vehicles/${id}`),
    
    // Scrap
    getScrap: () => apiCall('GET', '/scrap'),
    addScrap: (scrap) => apiCall('POST', '/scrap', scrap),
    updateScrap: (id, scrap) => apiCall('PUT', `/scrap/${id}`, scrap),
    deleteScrap: (id) => apiCall('DELETE', `/scrap/${id}`),
    
    // Expenses
    getExpenses: () => apiCall('GET', '/expenses'),
    addExpense: (expense) => apiCall('POST', '/expenses', expense),
    updateExpense: (id, expense) => apiCall('PUT', `/expenses/${id}`, expense),
    deleteExpense: (id) => apiCall('DELETE', `/expenses/${id}`),
    
    // Bills
    getBills: () => apiCall('GET', '/bills'),
    addBill: (bill) => apiCall('POST', '/bills', bill),
    updateBill: (id, bill) => apiCall('PUT', `/bills/${id}`, bill),
    deleteBill: (id) => apiCall('DELETE', `/bills/${id}`),
  };

  return (
    <ApiContext.Provider value={{ ...api, loading, error }}>
      {children}
    </ApiContext.Provider>
  );
};