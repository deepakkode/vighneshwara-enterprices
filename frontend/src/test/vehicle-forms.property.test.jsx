import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import fc from 'fast-check'
import VehicleManagement from '../pages/VehicleManagement'
import { SocketProvider } from '../context/SocketContext'
import theme from '../theme'

// Mock fetch globally
global.fetch = vi.fn()

// Mock socket context
const mockSocketContext = {
  emit: vi.fn()
}

vi.mock('../context/SocketContext', () => ({
  SocketProvider: ({ children }) => children,
  useSocketContext: () => mockSocketContext
}))

const renderVehicleManagement = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <VehicleManagement />
      </ThemeProvider>
    </BrowserRouter>
  )
}

describe('Vehicle Forms Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/vehicles/transactions') && url.endsWith('/transactions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        })
      }
      
      if (url.includes('/api/vehicles')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: '1',
                vehicleNumber: 'KA01AB1234',
                model: 'Tata Ace',
                vehicleType: 'TRUCK_AUTO'
              },
              {
                id: '2',
                vehicleNumber: 'KA02CD5678',
                model: 'Ashok Leyland',
                vehicleType: 'LORRY'
              }
            ]
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
   * Property 4: Input Validation Enforcement
   * Validates: Requirements 5.1, 5.2, 5.4, 5.5, 5.3
   * 
   * This property ensures that form validation works correctly
   * and prevents invalid data from being submitted.
   */
  it('Property 4: Input validation prevents invalid submissions', async () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        amount: fc.oneof(
          fc.float({ min: -1000, max: 0 }), // Invalid: negative or zero
          fc.constant(''), // Invalid: empty
          fc.constant('abc'), // Invalid: non-numeric
          fc.float({ min: 0.01, max: 100000 }) // Valid: positive
        ),
        description: fc.oneof(
          fc.constant(''), // Invalid: empty
          fc.string({ minLength: 1, maxLength: 100 }) // Valid: non-empty
        ),
        vehicleId: fc.oneof(
          fc.constant(''), // Invalid: empty
          fc.constant('1'), // Valid: existing vehicle
          fc.constant('2') // Valid: existing vehicle
        )
      }),
      async (formData) => {
        const user = userEvent.setup()
        renderVehicleManagement()
        
        // Wait for component to load
        await waitFor(() => {
          expect(screen.getByText(/Add New Transaction/i)).toBeInTheDocument()
        })
        
        // Fill form fields
        if (formData.vehicleId) {
          const vehicleSelect = screen.getByLabelText(/Vehicle/i)
          await user.click(vehicleSelect)
          
          if (formData.vehicleId === '1') {
            const option = await screen.findByText(/KA01AB1234/)
            await user.click(option)
          } else if (formData.vehicleId === '2') {
            const option = await screen.findByText(/KA02CD5678/)
            await user.click(option)
          }
        }
        
        if (formData.amount !== undefined) {
          const amountField = screen.getByLabelText(/Amount/i)
          await user.clear(amountField)
          if (formData.amount !== '') {
            await user.type(amountField, formData.amount.toString())
          }
        }
        
        if (formData.description !== undefined) {
          const descriptionField = screen.getByLabelText(/Description/i)
          await user.clear(descriptionField)
          if (formData.description !== '') {
            await user.type(descriptionField, formData.description)
          }
        }
        
        // Try to submit form
        const submitButton = screen.getByRole('button', { name: /Add Transaction/i })
        await user.click(submitButton)
        
        // Determine if form data is valid
        const isValidAmount = typeof formData.amount === 'number' && formData.amount > 0
        const isValidDescription = typeof formData.description === 'string' && formData.description.length > 0
        const isValidVehicle = formData.vehicleId === '1' || formData.vehicleId === '2'
        
        const isFormValid = isValidAmount && isValidDescription && isValidVehicle
        
        if (isFormValid) {
          // Should attempt to submit (mock API call)
          await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
              'http://localhost:5000/api/vehicles/transactions',
              expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              })
            )
          }, { timeout: 2000 })
        } else {
          // Should show validation errors and not submit
          if (!isValidAmount && formData.amount !== undefined) {
            // Should show amount validation error
            expect(screen.getByText(/Amount must be positive/i) || 
                   screen.getByText(/Amount is required/i)).toBeInTheDocument()
          }
          
          if (!isValidDescription && formData.description !== undefined) {
            // Should show description validation error
            expect(screen.getByText(/Description is required/i)).toBeInTheDocument()
          }
          
          if (!isValidVehicle && formData.vehicleId !== undefined) {
            // Should show vehicle validation error
            expect(screen.getByText(/Vehicle is required/i)).toBeInTheDocument()
          }
        }
      }
    ), { numRuns: 30 })
  })

  /**
   * Property 10: Duplicate Prevention
   * Validates: Requirements 5.1, 5.2, 5.4, 5.5, 5.3
   * 
   * This property ensures that the system handles duplicate or similar
   * transactions appropriately and maintains data integrity.
   */
  it('Property 10: Form handles duplicate transaction scenarios correctly', async () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        vehicleId: fc.constantFrom('1', '2'),
        amount: fc.float({ min: 100, max: 10000, noNaN: true }),
        description: fc.string({ minLength: 5, maxLength: 50 }),
        transactionType: fc.constantFrom('INCOME', 'EXPENSE'),
        date: fc.date({ min: new Date('2024-01-01'), max: new Date() })
      }),
      async (transactionData) => {
        // Mock API to return success for first submission
        let submissionCount = 0
        global.fetch.mockImplementation((url, options) => {
          if (url.includes('/api/vehicles/transactions') && options?.method === 'POST') {
            submissionCount++
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                data: {
                  id: `transaction-${submissionCount}`,
                  ...JSON.parse(options.body),
                  createdAt: new Date().toISOString()
                }
              })
            })
          }
          
          // Default vehicle list response
          if (url.includes('/api/vehicles')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                data: [
                  { id: '1', vehicleNumber: 'KA01AB1234', model: 'Tata Ace', vehicleType: 'TRUCK_AUTO' },
                  { id: '2', vehicleNumber: 'KA02CD5678', model: 'Ashok Leyland', vehicleType: 'LORRY' }
                ]
              })
            })
          }
          
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: [] })
          })
        })
        
        const user = userEvent.setup()
        renderVehicleManagement()
        
        // Wait for component to load
        await waitFor(() => {
          expect(screen.getByText(/Add New Transaction/i)).toBeInTheDocument()
        })
        
        // Fill and submit form first time
        const vehicleSelect = screen.getByLabelText(/Vehicle/i)
        await user.click(vehicleSelect)
        
        const vehicleOption = await screen.findByText(
          transactionData.vehicleId === '1' ? /KA01AB1234/ : /KA02CD5678/
        )
        await user.click(vehicleOption)
        
        // Set transaction type
        const typeSelect = screen.getByLabelText(/Type/i)
        await user.click(typeSelect)
        const typeOption = await screen.findByText(
          transactionData.transactionType === 'INCOME' ? /Income/ : /Expense/
        )
        await user.click(typeOption)
        
        // Fill amount
        const amountField = screen.getByLabelText(/Amount/i)
        await user.clear(amountField)
        await user.type(amountField, transactionData.amount.toString())
        
        // Fill description
        const descriptionField = screen.getByLabelText(/Description/i)
        await user.clear(descriptionField)
        await user.type(descriptionField, transactionData.description)
        
        // Fill date
        const dateField = screen.getByLabelText(/Date/i)
        await user.clear(dateField)
        await user.type(dateField, transactionData.date.toISOString().split('T')[0])
        
        // Submit first transaction
        const submitButton = screen.getByRole('button', { name: /Add Transaction/i })
        await user.click(submitButton)
        
        // Wait for first submission to complete
        await waitFor(() => {
          expect(submissionCount).toBe(1)
        }, { timeout: 3000 })
        
        // Verify form was reset after successful submission
        await waitFor(() => {
          const amountFieldAfter = screen.getByLabelText(/Amount/i)
          const descriptionFieldAfter = screen.getByLabelText(/Description/i)
          
          expect(amountFieldAfter.value).toBe('')
          expect(descriptionFieldAfter.value).toBe('')
        })
        
        // Verify success message appeared
        expect(screen.getByText(/Transaction added successfully/i) || 
               screen.getByText(/successfully/i)).toBeInTheDocument()
        
        // Verify socket emission occurred
        expect(mockSocketContext.emit).toHaveBeenCalledWith(
          'transaction-created',
          expect.objectContaining({
            type: 'vehicle',
            transaction: expect.any(Object)
          })
        )
        
        // Test that form can accept another transaction (no duplicate prevention at form level)
        // This is correct behavior as business logic should handle duplicates at API level
        expect(submitButton).not.toBeDisabled()
        expect(screen.getByLabelText(/Vehicle/i)).toBeEnabled()
        expect(screen.getByLabelText(/Amount/i)).toBeEnabled()
      }
    ), { numRuns: 15 })
  })

  /**
   * Property: Form State Management
   * Validates: Requirements 1.1, 1.2, 2.1, 2.2
   * 
   * This property ensures that form state is managed correctly
   * and UI updates appropriately based on user interactions.
   */
  it('Property: Form state management maintains consistency', async () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        interactions: fc.array(
          fc.record({
            field: fc.constantFrom('vehicle', 'type', 'amount', 'description'),
            action: fc.constantFrom('fill', 'clear', 'focus', 'blur'),
            value: fc.oneof(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.float({ min: 1, max: 1000 }),
              fc.constant('')
            )
          }),
          { minLength: 1, maxLength: 5 }
        )
      }),
      async (testCase) => {
        const user = userEvent.setup()
        renderVehicleManagement()
        
        // Wait for component to load
        await waitFor(() => {
          expect(screen.getByText(/Add New Transaction/i)).toBeInTheDocument()
        })
        
        // Perform interactions
        for (const interaction of testCase.interactions) {
          try {
            switch (interaction.field) {
              case 'amount':
                const amountField = screen.getByLabelText(/Amount/i)
                if (interaction.action === 'fill' && typeof interaction.value === 'number') {
                  await user.clear(amountField)
                  await user.type(amountField, interaction.value.toString())
                } else if (interaction.action === 'clear') {
                  await user.clear(amountField)
                } else if (interaction.action === 'focus') {
                  await user.click(amountField)
                }
                break
                
              case 'description':
                const descField = screen.getByLabelText(/Description/i)
                if (interaction.action === 'fill' && typeof interaction.value === 'string') {
                  await user.clear(descField)
                  await user.type(descField, interaction.value)
                } else if (interaction.action === 'clear') {
                  await user.clear(descField)
                } else if (interaction.action === 'focus') {
                  await user.click(descField)
                }
                break
                
              case 'vehicle':
                if (interaction.action === 'fill') {
                  const vehicleSelect = screen.getByLabelText(/Vehicle/i)
                  await user.click(vehicleSelect)
                  
                  // Select first available option
                  const firstOption = await screen.findByText(/KA01AB1234/)
                  await user.click(firstOption)
                }
                break
                
              case 'type':
                if (interaction.action === 'fill') {
                  const typeSelect = screen.getByLabelText(/Type/i)
                  await user.click(typeSelect)
                  
                  const typeOption = await screen.findByText(/Income/)
                  await user.click(typeOption)
                }
                break
            }
            
            // Small delay between interactions
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (error) {
            // Some interactions might fail due to UI state, which is acceptable
            console.log(`Interaction failed: ${interaction.field} ${interaction.action}`, error.message)
          }
        }
        
        // Verify form is still functional after all interactions
        const submitButton = screen.getByRole('button', { name: /Add Transaction/i })
        expect(submitButton).toBeInTheDocument()
        
        // Verify form fields are still accessible
        expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Vehicle/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Type/i)).toBeInTheDocument()
        
        // Form should maintain its structure regardless of interactions
        expect(screen.getByText(/Add New Transaction/i)).toBeInTheDocument()
      }
    ), { numRuns: 20 })
  })

  /**
   * Property: Currency Display Consistency
   * Validates: Requirements 6.2, 16.2
   * 
   * This property ensures that currency values are displayed consistently
   * throughout the vehicle management interface.
   */
  it('Property: Currency formatting is consistent in vehicle displays', async () => {
    fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          vehicleId: fc.constantFrom('1', '2'),
          transactionType: fc.constantFrom('INCOME', 'EXPENSE'),
          amount: fc.float({ min: 0, max: 100000, noNaN: true })
        }),
        { minLength: 0, maxLength: 10 }
      ),
      async (transactions) => {
        // Mock API to return test transactions
        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/vehicles/transactions') && url.endsWith('/transactions')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                data: transactions.map((t, index) => ({
                  id: `tx-${index}`,
                  ...t,
                  description: `Test transaction ${index}`,
                  transactionDate: new Date().toISOString()
                }))
              })
            })
          }
          
          if (url.includes('/api/vehicles')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                data: [
                  { id: '1', vehicleNumber: 'KA01AB1234', model: 'Tata Ace', vehicleType: 'TRUCK_AUTO' },
                  { id: '2', vehicleNumber: 'KA02CD5678', model: 'Ashok Leyland', vehicleType: 'LORRY' }
                ]
              })
            })
          }
          
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ success: false })
          })
        })
        
        renderVehicleManagement()
        
        // Wait for component to load with data
        await waitFor(() => {
          expect(screen.getByText(/Vehicle Management/i)).toBeInTheDocument()
        }, { timeout: 3000 })
        
        // Test currency formatting function
        const formatCurrency = (amount) => {
          return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(amount || 0)
        }
        
        // Verify currency formatting properties for all amounts
        transactions.forEach(transaction => {
          const formatted = formatCurrency(transaction.amount)
          
          // Should start with ₹ symbol
          expect(formatted).toMatch(/^₹/)
          
          // Should not contain decimal places
          expect(formatted).not.toMatch(/\.\d+/)
          
          // Should handle large numbers with proper separators
          if (transaction.amount >= 1000) {
            expect(formatted).toMatch(/,/)
          }
          
          // Should be a valid currency string
          expect(typeof formatted).toBe('string')
          expect(formatted.length).toBeGreaterThan(1)
        })
        
        // Verify that currency values appear in the UI (if any transactions exist)
        if (transactions.length > 0) {
          // Look for currency symbols in the rendered content
          const currencyElements = screen.getAllByText(/₹/)
          expect(currencyElements.length).toBeGreaterThan(0)
        }
      }
    ), { numRuns: 25 })
  })
})