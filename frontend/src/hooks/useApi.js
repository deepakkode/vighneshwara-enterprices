import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../context/ApiContext';
import toast from 'react-hot-toast';

// Dashboard hook
export const useDashboard = () => {
  const { dashboardApi, loading: apiLoading } = useApi();
  const [dashboardData, setDashboardData] = useState({
    totalProfit: 0,
    vehicleEarnings: 0,
    scrapTrading: 0,
    billsGenerated: 0,
    trends: {}
  });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

  const refreshDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getSummary();
      if (response.success) {
        setDashboardData({
          totalProfit: response.data.totalBusinessProfit || 0,
          vehicleEarnings: response.data.totalVehicleProfit || 0,
          scrapTrading: response.data.scrapProfit || 0,
          billsGenerated: response.data.billsGenerated || 0,
          trends: response.data.trends || {},
          lastUpdated: response.data.lastUpdated
        });
        setConnected(true);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setConnected(false);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dashboardApi]);

  useEffect(() => {
    refreshDashboardData();
  }, [refreshDashboardData]);

  return {
    dashboardData,
    loading: loading || apiLoading,
    connected,
    refreshDashboardData
  };
};

// Chart data hook
export const useChartData = () => {
  const { dashboardApi, analyticsApi } = useApi();
  const [chartData, setChartData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshChartData = useCallback(async () => {
    try {
      setLoading(true);
      const [chartResponse, weeklyResponse] = await Promise.all([
        analyticsApi.getChartData().catch(() => ({ success: false })),
        dashboardApi.getWeeklySummary()
      ]);

      if (chartResponse.success) {
        setChartData(chartResponse.data);
      }

      if (weeklyResponse.success) {
        setWeeklyData(weeklyResponse.data);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      toast.error('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [dashboardApi, analyticsApi]);

  useEffect(() => {
    refreshChartData();
  }, [refreshChartData]);

  return {
    chartData,
    weeklyData,
    loading,
    refreshChartData
  };
};

// Vehicles hook
export const useVehicles = () => {
  const { vehicleApi } = useApi();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await vehicleApi.getAll();
      if (response.success) {
        setVehicles(response.data);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [vehicleApi]);

  const addVehicle = useCallback(async (vehicleData) => {
    try {
      const response = await vehicleApi.create(vehicleData);
      if (response.success) {
        setVehicles(prev => [response.data, ...prev]);
        toast.success('Vehicle added successfully');
        return response.data;
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error('Failed to add vehicle');
      throw error;
    }
  }, [vehicleApi]);

  const updateVehicle = useCallback(async (id, vehicleData) => {
    try {
      const response = await vehicleApi.update(id, vehicleData);
      if (response.success) {
        setVehicles(prev => prev.map(v => v.id === id ? response.data : v));
        toast.success('Vehicle updated successfully');
        return response.data;
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error('Failed to update vehicle');
      throw error;
    }
  }, [vehicleApi]);

  const deleteVehicle = useCallback(async (id) => {
    try {
      const response = await vehicleApi.delete(id);
      if (response.success) {
        setVehicles(prev => prev.filter(v => v.id !== id));
        toast.success('Vehicle deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
      throw error;
    }
  }, [vehicleApi]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  return {
    vehicles,
    loading,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    refreshVehicles: loadVehicles
  };
};

// Vehicle transactions hook
export const useVehicleTransactions = () => {
  const { vehicleApi } = useApi();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const response = await vehicleApi.getAllTransactions(params);
      if (response.success) {
        setTransactions(response.data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [vehicleApi]);

  const addTransaction = useCallback(async (transactionData) => {
    try {
      const response = await vehicleApi.createTransaction(transactionData);
      if (response.success) {
        setTransactions(prev => [response.data, ...prev]);
        toast.success('Transaction added successfully');
        return response.data;
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
      throw error;
    }
  }, [vehicleApi]);

  const updateTransaction = useCallback(async (id, transactionData) => {
    try {
      const response = await vehicleApi.updateTransaction(id, transactionData);
      if (response.success) {
        setTransactions(prev => prev.map(t => t.id === id ? response.data : t));
        toast.success('Transaction updated successfully');
        return response.data;
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
      throw error;
    }
  }, [vehicleApi]);

  const deleteTransaction = useCallback(async (id) => {
    try {
      const response = await vehicleApi.deleteTransaction(id);
      if (response.success) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        toast.success('Transaction deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
      throw error;
    }
  }, [vehicleApi]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions: loadTransactions
  };
};

// Vehicle analytics hook
export const useVehicleAnalytics = (days = 7) => {
  const { analyticsApi } = useApi();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const response = await analyticsApi.getVehicleAnalytics(days);
        if (response.success) {
          setAnalytics(response.data);
        }
      } catch (error) {
        console.error('Error loading vehicle analytics:', error);
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [analyticsApi, days]);

  return { analytics, loading };
};

// Scrap transactions hook
export const useScrapTransactions = () => {
  const { scrapApi } = useApi();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const response = await scrapApi.getAll(params);
      if (response.success) {
        setTransactions(response.data);
      }
    } catch (error) {
      console.error('Error loading scrap transactions:', error);
      toast.error('Failed to load scrap transactions');
    } finally {
      setLoading(false);
    }
  }, [scrapApi]);

  const addTransaction = useCallback(async (transactionData) => {
    try {
      const response = await scrapApi.create(transactionData);
      if (response.success) {
        setTransactions(prev => [response.data, ...prev]);
        toast.success('Scrap transaction added successfully');
        return response.data;
      }
    } catch (error) {
      console.error('Error adding scrap transaction:', error);
      toast.error('Failed to add scrap transaction');
      throw error;
    }
  }, [scrapApi]);

  const updateTransaction = useCallback(async (id, transactionData) => {
    try {
      const response = await scrapApi.update(id, transactionData);
      if (response.success) {
        setTransactions(prev => prev.map(t => t.id === id ? response.data : t));
        toast.success('Scrap transaction updated successfully');
        return response.data;
      }
    } catch (error) {
      console.error('Error updating scrap transaction:', error);
      toast.error('Failed to update scrap transaction');
      throw error;
    }
  }, [scrapApi]);

  const deleteTransaction = useCallback(async (id) => {
    try {
      const response = await scrapApi.delete(id);
      if (response.success) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        toast.success('Scrap transaction deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting scrap transaction:', error);
      toast.error('Failed to delete scrap transaction');
      throw error;
    }
  }, [scrapApi]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions: loadTransactions
  };
};

// Scrap analytics hook
export const useScrapAnalytics = (days = 7) => {
  const { analyticsApi } = useApi();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const response = await analyticsApi.getScrapAnalytics(days);
        if (response.success) {
          setAnalytics(response.data);
        }
      } catch (error) {
        console.error('Error loading scrap analytics:', error);
        toast.error('Failed to load scrap analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [analyticsApi, days]);

  return { analytics, loading };
};

// Bills hook
export const useBills = () => {
  const { billsApi } = useApi();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBills = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const response = await billsApi.getAll(params);
      if (response.success) {
        setBills(response.data);
      }
    } catch (error) {
      console.error('Error loading bills:', error);
      toast.error('Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [billsApi]);

  const createBill = useCallback(async (billData) => {
    try {
      const response = await billsApi.create(billData);
      if (response.success) {
        setBills(prev => [response.data, ...prev]);
        toast.success('Bill created successfully');
        return response.data;
      }
    } catch (error) {
      console.error('Error creating bill:', error);
      toast.error('Failed to create bill');
      throw error;
    }
  }, [billsApi]);

  const updateBill = useCallback(async (id, billData) => {
    try {
      const response = await billsApi.update(id, billData);
      if (response.success) {
        setBills(prev => prev.map(b => b.id === id ? response.data : b));
        toast.success('Bill updated successfully');
        return response.data;
      }
    } catch (error) {
      console.error('Error updating bill:', error);
      toast.error('Failed to update bill');
      throw error;
    }
  }, [billsApi]);

  const deleteBill = useCallback(async (id) => {
    try {
      const response = await billsApi.delete(id);
      if (response.success) {
        setBills(prev => prev.filter(b => b.id !== id));
        toast.success('Bill deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast.error('Failed to delete bill');
      throw error;
    }
  }, [billsApi]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  return {
    bills,
    loading,
    createBill,
    updateBill,
    deleteBill,
    refreshBills: loadBills
  };
};