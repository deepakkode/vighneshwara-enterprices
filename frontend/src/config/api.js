// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

// API Endpoints
export const API_ENDPOINTS = {
  // Analytics
  DASHBOARD_SUMMARY: `${API_BASE_URL}/api/analytics/dashboard-summary`,
  PROFIT_TRENDS: `${API_BASE_URL}/api/analytics/profit-trends`,
  WEEKLY_SUMMARY: `${API_BASE_URL}/api/analytics/weekly-summary`,
  
  // Vehicles
  VEHICLES: `${API_BASE_URL}/api/vehicles`,
  VEHICLE_TRANSACTIONS: `${API_BASE_URL}/api/vehicles/transactions/all`,
  VEHICLE_TRANSACTIONS_CREATE: `${API_BASE_URL}/api/vehicles/transactions`,
  
  // Scrap
  SCRAP_TRANSACTIONS: `${API_BASE_URL}/api/scrap/transactions`,
  
  // Bills
  BILLS: `${API_BASE_URL}/api/bills`,
  
  // Socket.io
  SOCKET_URL: API_BASE_URL
}

export default API_ENDPOINTS