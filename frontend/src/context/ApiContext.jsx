import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const ApiContext = createContext();

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

// Configure your backend URL here
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ApiProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(true);

  // Helper function to handle API calls
  const apiCall = useCallback(async (method, url, data = null) => {
    try {
      setLoading(true);
      setError(null);
      setConnected(true);
      
      const config = {
        method,
        url,
        ...(data && { data }),
      };
      
      const response = await api(config);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMessage);
      setConnected(false);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Dashboard API functions
  const dashboardApi = {
    getSummary: useCallback((date = null) => {
      const params = date ? `?date=${date}` : '';
      return apiCall('GET', `/analytics/dashboard-summary${params}`);
    }, [apiCall]),
    
    getWeeklySummary: useCallback(() => {
      return apiCall('GET', '/analytics/weekly-summary');
    }, [apiCall]),
    
    getMonthlySummary: useCallback(() => {
      return apiCall('GET', '/analytics/monthly-summary');
    }, [apiCall]),
    
    getChartData: useCallback(() => {
      return apiCall('GET', '/analytics/chart-data');
    }, [apiCall]),
  };

  // Vehicle API functions
  const vehicleApi = {
    getAll: useCallback(() => apiCall('GET', '/vehicles'), [apiCall]),
    getById: useCallback((id) => apiCall('GET', `/vehicles/${id}`), [apiCall]),
    create: useCallback((vehicleData) => apiCall('POST', '/vehicles', vehicleData), [apiCall]),
    update: useCallback((id, vehicleData) => apiCall('PUT', `/vehicles/${id}`, vehicleData), [apiCall]),
    delete: useCallback((id) => apiCall('DELETE', `/vehicles/${id}`), [apiCall]),
    
    // Vehicle transactions
    getAllTransactions: useCallback((params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall('GET', `/vehicles/transactions/all?${queryString}`);
    }, [apiCall]),
    
    createTransaction: useCallback((transactionData) => 
      apiCall('POST', '/vehicles/transactions', transactionData), [apiCall]),
    
    getTransaction: useCallback((id) => apiCall('GET', `/vehicles/transactions/${id}`), [apiCall]),
    
    updateTransaction: useCallback((id, transactionData) => 
      apiCall('PUT', `/vehicles/transactions/${id}`, transactionData), [apiCall]),
    
    deleteTransaction: useCallback((id) => apiCall('DELETE', `/vehicles/transactions/${id}`), [apiCall]),
    
    getProfitSummary: useCallback((params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall('GET', `/vehicles/profit/summary?${queryString}`);
    }, [apiCall]),
  };

  // Scrap API functions
  const scrapApi = {
    getAll: useCallback((params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall('GET', `/scrap?${queryString}`);
    }, [apiCall]),
    
    create: useCallback((scrapData) => apiCall('POST', '/scrap', scrapData), [apiCall]),
    getById: useCallback((id) => apiCall('GET', `/scrap/${id}`), [apiCall]),
    update: useCallback((id, scrapData) => apiCall('PUT', `/scrap/${id}`, scrapData), [apiCall]),
    delete: useCallback((id) => apiCall('DELETE', `/scrap/${id}`), [apiCall]),
    
    getProfitSummary: useCallback((params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall('GET', `/scrap/profit-summary?${queryString}`);
    }, [apiCall]),
  };

  // Bills API functions
  const billsApi = {
    getAll: useCallback((params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall('GET', `/bills?${queryString}`);
    }, [apiCall]),
    
    create: useCallback((billData) => apiCall('POST', '/bills', billData), [apiCall]),
    getById: useCallback((id) => apiCall('GET', `/bills/${id}`), [apiCall]),
    update: useCallback((id, billData) => apiCall('PUT', `/bills/${id}`, billData), [apiCall]),
    delete: useCallback((id) => apiCall('DELETE', `/bills/${id}`), [apiCall]),
  };

  // Analytics API functions
  const analyticsApi = {
    getVehicleAnalytics: useCallback((days = 7) => {
      return apiCall('GET', `/analytics/vehicle-analytics?days=${days}`);
    }, [apiCall]),
    
    getScrapAnalytics: useCallback((days = 7) => {
      return apiCall('GET', `/analytics/scrap-analytics?days=${days}`);
    }, [apiCall]),
    
    getChartData: useCallback(() => {
      return apiCall('GET', '/analytics/chart-data');
    }, [apiCall]),
  };

  const value = {
    loading,
    error,
    connected,
    dashboardApi,
    vehicleApi,
    scrapApi,
    billsApi,
    analyticsApi,
    // Legacy compatibility - emit function for existing code
    emit: () => {}, // No-op for now, can implement WebSocket later if needed
    isOnline: connected,
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};