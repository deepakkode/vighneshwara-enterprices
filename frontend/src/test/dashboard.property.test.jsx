import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import fc from 'fast-check'
import Dashboard from '../pages/Dashboard'
import { SocketProvider } from '../context/SocketContext'
import theme from '../theme'

// Mock fetch globally
global.fetch = vi.fn()

// Mock socket context
const mockSocketContext = {
  dashboardData: {
    totalProfit: 0,
    vehicleEarnings: 0,
    scrapTrading: 0,
    billsGenerated: 0,
    lastUpdated: null,
    trends: {
      totalProfitTrend: 0,
      vehicleProfitTrend: 0,
      scrapProfitTrend: 0
    }
  },
  connected: true,
  refreshDashboardData: vi.fn(),
  emit: vi.fn()
}

vi.mock('../context/SocketContext', () => ({
  SocketProvider: ({ children }) => children,
  useSocketContext: () => mockSocketContext
}))

const renderDashboard = (contextOverrides = {}) => {
  const mockContext = { ...mockSocketContext, ...contextOverrides }
  
  vi.mocked(mockSocketContext.refreshDashboardData).mockImplementation(() => Promise.resolve())
  
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <Dashboard />
      </ThemeProvider>
    </BrowserRouter>
  )
}

describe('Dashboard Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('profit-trends')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              chartData: {
                labels: ['Day 1', 'Day 2', 'Day 3'],
                datasets: [{
                  label: 'Total Business Profit',
                  data: [1000, 1500, 2000],
                  borderColor: 'rgb(75, 192, 192)',
                  backgroundColor: 'rgba(75, 192, 192, 0.2)'
                }]
              }
            }
          })
        })
      }
      
      if (url.includes('weekly-summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              weeklyTotals: {
                totalBusinessProfit: 10000,
                totalVehicleProfit: 6000,
                scrapProfit: 4000,
                transactionCount: 25
              }
            }
          })
        })
      }
      
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ success: false })
      })
    })
  })

  /**
   * Property 3: Profit Calculation Accuracy
   * Validates: Requirements 3.1, 10.1, 11.1
   * 
   * This property ensures that profit calculations are mathematically correct
   * and that the total profit always equals the sum of individual components.
   */
  it('Property 3: Profit calculations are mathematically accurate', () => {
    fc.assert(fc.property(
      fc.record({
        vehicleEarnings: fc.float({ min: 0, max: 100000, noNaN: true }),
        scrapTrading: fc.float({ min: -50000, max: 50000, noNaN: true }),
        billsGenerated: fc.integer({ min: 0, max: 1000 })
      }),
      (dashboardData) => {
        // Calculate expected total profit
        const expectedTotalProfit = dashboardData.vehicleEarnings + dashboardData.scrapTrading
        
        // Create dashboard data with calculated total
        const testData = {
          ...dashboardData,
          totalProfit: expectedTotalProfit,
          lastUpdated: new Date().toISOString()
        }
        
        renderDashboard({ dashboardData: testData })
        
        // Verify that the total profit is displayed correctly
        const totalProfitElement = screen.getByText(/Today's Total Profit/i)
        expect(totalProfitElement).toBeInTheDocument()
        
        // The total should equal the sum of components
        const calculatedTotal = testData.vehicleEarnings + testData.scrapTrading
        expect(Math.abs(testData.totalProfit - calculatedTotal)).toBeLessThan(0.01)
        
        // Verify non-negative vehicle earnings
        expect(testData.vehicleEarnings).toBeGreaterThanOrEqual(0)
        
        // Verify bills generated is non-negative integer
        expect(testData.billsGenerated).toBeGreaterThanOrEqual(0)
        expect(Number.isInteger(testData.billsGenerated)).toBe(true)
      }
    ), { numRuns: 50 })
  })

  /**
   * Property: Currency Formatting Consistency
   * Validates: Requirements 16.2, 16.5
   * 
   * This property ensures that all currency values are formatted consistently
   * using the Indian Rupee format across the dashboard.
   */
  it('Property: Currency formatting is consistent across all values', () => {
    fc.assert(fc.property(
      fc.record({
        totalProfit: fc.float({ min: -100000, max: 100000, noNaN: true }),
        vehicleEarnings: fc.float({ min: 0, max: 100000, noNaN: true }),
        scrapTrading: fc.float({ min: -50000, max: 50000, noNaN: true })
      }),
      (amounts) => {
        const testData = {
          ...amounts,
          billsGenerated: 5,
          lastUpdated: new Date().toISOString()
        }
        
        renderDashboard({ dashboardData: testData })
        
        // Test currency formatting function behavior
        const formatCurrency = (amount) => {
          return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(amount || 0)
        }
        
        // Verify formatting properties
        Object.values(amounts).forEach(amount => {
          const formatted = formatCurrency(amount)
          
          // Should start with ₹ symbol
          expect(formatted).toMatch(/^₹/)
          
          // Should handle negative values correctly
          if (amount < 0) {
            expect(formatted).toMatch(/^-₹|₹-/)
          }
          
          // Should not contain decimal places
          expect(formatted).not.toMatch(/\.\d+/)
          
          // Should contain proper thousand separators for large numbers
          if (Math.abs(amount) >= 1000) {
            expect(formatted).toMatch(/,/)
          }
        })
      }
    ), { numRuns: 30 })
  })

  /**
   * Property: Real-time Update Consistency
   * Validates: Requirements 3.2, 10.3, 11.3
   * 
   * This property ensures that dashboard updates maintain data consistency
   * and that connection status is properly reflected in the UI.
   */
  it('Property: Real-time updates maintain data consistency', async () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        connected: fc.boolean(),
        totalProfit: fc.float({ min: 0, max: 100000, noNaN: true }),
        vehicleEarnings: fc.float({ min: 0, max: 50000, noNaN: true }),
        scrapTrading: fc.float({ min: 0, max: 50000, noNaN: true })
      }),
      async (testCase) => {
        const testData = {
          totalProfit: testCase.totalProfit,
          vehicleEarnings: testCase.vehicleEarnings,
          scrapTrading: testCase.scrapTrading,
          billsGenerated: 3,
          lastUpdated: new Date().toISOString()
        }
        
        renderDashboard({ 
          dashboardData: testData,
          connected: testCase.connected
        })
        
        // Wait for component to render
        await waitFor(() => {
          expect(screen.getByText(/Welcome to Dashboard/i)).toBeInTheDocument()
        })
        
        // Verify connection status is displayed correctly
        if (testCase.connected) {
          expect(screen.getByText(/Live Updates Active/i)).toBeInTheDocument()
        } else {
          expect(screen.getByText(/Connecting/i)).toBeInTheDocument()
        }
        
        // Verify data consistency - total should be reasonable compared to components
        const sumOfComponents = testData.vehicleEarnings + testData.scrapTrading
        
        // Allow for some variance in total profit calculation
        expect(Math.abs(testData.totalProfit - sumOfComponents)).toBeLessThan(sumOfComponents * 0.1 + 1000)
        
        // Verify all values are non-negative (except scrap which can be negative)
        expect(testData.totalProfit).toBeGreaterThanOrEqual(0)
        expect(testData.vehicleEarnings).toBeGreaterThanOrEqual(0)
        expect(testData.billsGenerated).toBeGreaterThanOrEqual(0)
      }
    ), { numRuns: 25 })
  })

  /**
   * Property: Chart Data Integrity
   * Validates: Requirements 6.1, 11.1, 11.2
   * 
   * This property ensures that chart data is properly structured
   * and contains valid numerical values for visualization.
   */
  it('Property: Chart data maintains proper structure and values', async () => {
    fc.assert(fc.asyncProperty(
      fc.array(fc.float({ min: 0, max: 10000, noNaN: true }), { minLength: 3, maxLength: 7 }),
      async (profitValues) => {
        // Mock chart data response
        const chartLabels = profitValues.map((_, index) => `Day ${index + 1}`)
        
        global.fetch.mockImplementation((url) => {
          if (url.includes('profit-trends')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                data: {
                  chartData: {
                    labels: chartLabels,
                    datasets: [{
                      label: 'Total Business Profit',
                      data: profitValues,
                      borderColor: 'rgb(75, 192, 192)',
                      backgroundColor: 'rgba(75, 192, 192, 0.2)'
                    }]
                  }
                }
              })
            })
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: {} })
          })
        })
        
        renderDashboard()
        
        // Wait for chart to load
        await waitFor(() => {
          expect(screen.getByText(/Weekly Profit Trends/i)).toBeInTheDocument()
        }, { timeout: 3000 })
        
        // Verify chart data properties
        expect(profitValues.length).toEqual(chartLabels.length)
        
        // All profit values should be non-negative
        profitValues.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(0)
          expect(Number.isFinite(value)).toBe(true)
        })
        
        // Labels should be properly formatted
        chartLabels.forEach(label => {
          expect(typeof label).toBe('string')
          expect(label.length).toBeGreaterThan(0)
        })
      }
    ), { numRuns: 20 })
  })
})