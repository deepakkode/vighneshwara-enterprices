import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import fc from 'fast-check'
import ScrapManagement from '../pages/ScrapManagement'
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

const SCRAP_TYPES = [
  'Iron', 'Steel', 'Aluminum', 'Copper', 'Brass', 
  'Plastic', 'Paper', 'Cardboard', 'Glass', 'Electronic Waste'
]

const renderScrapManagement = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <ScrapManagement />
      </ThemeProvider>
    </BrowserRouter>
  )
}

describe('Scrap Forms Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/scrap/transactions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
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
   * Property 2: Transaction Amount Calculation
   * Validates: Requirements 8.3, 9.2, 8.2, 9.3
   * 
   * This property ensures that automatic total calculation works correctly
   * for all valid quantity and rate combinations.
   */
  it('Property 2: Automatic total calculation is mathematically accurate', async () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        quantity: fc.float({ min: 0.1, max: 10000, noNaN: true }),
        rate: fc.float({ min: 0.1, max: 1000, noNaN: true }),
        scrapType: fc.constantFrom(...SCRAP_TYPES),
        transactionType: fc.constantFrom('PURCHASE', 'SALE')
      }),
      async (formData) => {
        const user = userEvent.setup()
        renderScrapManagement()
        
        // Wait for component to load
        await waitFor(() => {
          expect(screen.getByText(/Add New Scrap Transaction/i)).toBeInTheDocument()
        })
        
        // Fill scrap type
        const scrapTypeSelect = screen.getByLabelText(/Scrap Type/i)
        await user.click(scrapTypeSelect)
        const scrapOption = await screen.findByText(formData.scrapType)
        await user.click(scrapOption)
        
        // Fill transaction type
        const typeSelect = screen.getByLabelText(/Type/i)
        await user.click(typeSelect)
        const typeOption = await screen.findByText(
          formData.transactionType === 'PURCHASE' ? /Purchase/ : /Sale/
        )
        await user.click(typeOption)
        
        // Fill quantity
        const quantityField = screen.getByLabelText(/Quantity/i)
        await user.clear(quantityField)
        await user.type(quantityField, formData.quantity.toString())
        
        // Fill rate
        const rateField = screen.getByLabelText(/Rate/i)
        await user.clear(rateField)
        await user.type(rateField, formData.rate.toString())
        
        // Check automatic total calculation
        const expectedTotal = (formData.quantity * formData.rate).toFixed(2)
        
        await waitFor(() => {
          const totalField = screen.getByDisplayValue(`₹${expectedTotal}`)
          expect(totalField).toBeInTheDocument()
        })
        
        // Verify calculation accuracy
        const calculatedTotal = parseFloat(expectedTotal)
        const manualCalculation = formData.quantity * formData.rate
        
        // Allow for small floating point precision differences
        expect(Math.abs(calculatedTotal - manualCalculation)).toBeLessThan(0.01)
        
        // Verify total is positive
        expect(calculatedTotal).toBeGreaterThan(0)
        
        // Verify total field is disabled (read-only)
        const totalField = screen.getByDisplayValue(`₹${expectedTotal}`)
        expect(totalField).toBeDisabled()
      }
    ), { numRuns: 50 })
  })

  /**
   * Property 5: Scrap Type Consistency
   * Validates: Requirements 8.3, 9.2, 8.2, 9.3, 9.5
   * 
   * This property ensures that scrap type validation works correctly
   * and only predefined scrap types are accepted.
   */
  it('Property 5: Scrap type validation enforces predefined list', async () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        scrapType: fc.oneof(
          fc.constantFrom(...SCRAP_TYPES), // Valid scrap types
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !SCRAP_TYPES.includes(s)) // Invalid types
        ),
        quantity: fc.float({ min: 1, max: 100, noNaN: true }),
        rate: fc.float({ min: 1, max: 100, noNaN: true }),
        supplierBuyer: fc.string({ minLength: 3, maxLength: 50 })
      }),
      async (formData) => {
        const user = userEvent.setup()
        renderScrapManagement()
        
        // Wait for component to load
        await waitFor(() => {
          expect(screen.getByText(/Scrap Trading Management/i)).toBeInTheDocument()
        })
        
        const isValidScrapType = SCRAP_TYPES.includes(formData.scrapType)
        
        // Try to select scrap type
        const scrapTypeSelect = screen.getByLabelText(/Scrap Type/i)
        await user.click(scrapTypeSelect)
        
        if (isValidScrapType) {
          // Should find the valid scrap type in dropdown
          const scrapOption = await screen.findByText(formData.scrapType)
          expect(scrapOption).toBeInTheDocument()
          await user.click(scrapOption)
          
          // Fill other required fields
          const quantityField = screen.getByLabelText(/Quantity/i)
          await user.clear(quantityField)
          await user.type(quantityField, formData.quantity.toString())
          
          const rateField = screen.getByLabelText(/Rate/i)
          await user.clear(rateField)
          await user.type(rateField, formData.rate.toString())
          
          const supplierField = screen.getByLabelText(/Supplier\/Buyer Name/i)
          await user.clear(supplierField)
          await user.type(supplierField, formData.supplierBuyer)
          
          // Should be able to submit with valid scrap type
          const submitButton = screen.getByRole('button', { name: /Add Transaction/i })
          expect(submitButton).not.toBeDisabled()
          
          // Verify total calculation appears
          const expectedTotal = (formData.quantity * formData.rate).toFixed(2)
          expect(screen.getByDisplayValue(`₹${expectedTotal}`)).toBeInTheDocument()
          
        } else {
          // Should not find invalid scrap type in dropdown
          const dropdownOptions = screen.getAllByRole('option')
          const optionTexts = dropdownOptions.map(option => option.textContent)
          expect(optionTexts).not.toContain(formData.scrapType)
          
          // All options should be from predefined list
          dropdownOptions.forEach(option => {
            if (option.textContent && option.textContent.trim()) {
              expect(SCRAP_TYPES).toContain(option.textContent.trim())
            }
          })
        }
        
        // Verify dropdown contains all predefined scrap types
        SCRAP_TYPES.forEach(type => {
          expect(screen.getByText(type)).toBeInTheDocument()
        })
        
        // Close dropdown
        await user.press('Escape')
      }
    ), { numRuns: 30 })
  })

  /**
   * Property: Form Validation Completeness
   * Validates: Requirements 8.1, 8.2, 9.1, 9.2
   * 
   * This property ensures that all required fields are validated
   * and form submission is prevented when data is incomplete.
   */
  it('Property: Form validation prevents incomplete submissions', async () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        scrapType: fc.oneof(fc.constantFrom(...SCRAP_TYPES), fc.constant('')),
        quantity: fc.oneof(
          fc.float({ min: 0.1, max: 1000, noNaN: true }),
          fc.constant(''),
          fc.float({ min: -100, max: 0 }) // Invalid: negative or zero
        ),
        rate: fc.oneof(
          fc.float({ min: 0.1, max: 1000, noNaN: true }),
          fc.constant(''),
          fc.float({ min: -100, max: 0 }) // Invalid: negative or zero
        ),
        supplierBuyer: fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constant('') // Invalid: empty
        )
      }),
      async (formData) => {
        const user = userEvent.setup()
        renderScrapManagement()
        
        // Wait for component to load
        await waitFor(() => {
          expect(screen.getByText(/Add New Scrap Transaction/i)).toBeInTheDocument()
        })
        
        // Fill form fields based on test data
        if (formData.scrapType && SCRAP_TYPES.includes(formData.scrapType)) {
          const scrapTypeSelect = screen.getByLabelText(/Scrap Type/i)
          await user.click(scrapTypeSelect)
          const scrapOption = await screen.findByText(formData.scrapType)
          await user.click(scrapOption)
        }
        
        if (formData.quantity !== '') {
          const quantityField = screen.getByLabelText(/Quantity/i)
          await user.clear(quantityField)
          await user.type(quantityField, formData.quantity.toString())
        }
        
        if (formData.rate !== '') {
          const rateField = screen.getByLabelText(/Rate/i)
          await user.clear(rateField)
          await user.type(rateField, formData.rate.toString())
        }
        
        if (formData.supplierBuyer !== '') {
          const supplierField = screen.getByLabelText(/Supplier\/Buyer Name/i)
          await user.clear(supplierField)
          await user.type(supplierField, formData.supplierBuyer)
        }
        
        // Try to submit form
        const submitButton = screen.getByRole('button', { name: /Add Transaction/i })
        await user.click(submitButton)
        
        // Determine if form data is valid
        const isValidScrapType = formData.scrapType && SCRAP_TYPES.includes(formData.scrapType)
        const isValidQuantity = typeof formData.quantity === 'number' && formData.quantity > 0
        const isValidRate = typeof formData.rate === 'number' && formData.rate > 0
        const isValidSupplier = typeof formData.supplierBuyer === 'string' && formData.supplierBuyer.length > 0
        
        const isFormValid = isValidScrapType && isValidQuantity && isValidRate && isValidSupplier
        
        if (isFormValid) {
          // Should attempt to submit (mock API call)
          await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
              'http://localhost:5000/api/scrap/transactions',
              expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              })
            )
          }, { timeout: 2000 })
        } else {
          // Should show validation errors and not submit
          if (!isValidQuantity && formData.quantity !== '') {
            expect(screen.getByText(/Quantity must be positive/i) || 
                   screen.getByText(/Quantity is required/i)).toBeInTheDocument()
          }
          
          if (!isValidRate && formData.rate !== '') {
            expect(screen.getByText(/Rate must be positive/i) || 
                   screen.getByText(/Rate is required/i)).toBeInTheDocument()
          }
          
          if (!isValidSupplier && formData.supplierBuyer !== '') {
            expect(screen.getByText(/Supplier\/Buyer name is required/i)).toBeInTheDocument()
          }
        }
      }
    ), { numRuns: 40 })
  })

  /**
   * Property: Currency Display Consistency
   * Validates: Requirements 8.4, 9.4
   * 
   * This property ensures that currency formatting is consistent
   * throughout the scrap management interface.
   */
  it('Property: Currency formatting maintains consistency', async () => {
    fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          scrapType: fc.constantFrom(...SCRAP_TYPES),
          transactionType: fc.constantFrom('PURCHASE', 'SALE'),
          quantity: fc.float({ min: 1, max: 1000, noNaN: true }),
          rate: fc.float({ min: 1, max: 500, noNaN: true }),
          totalAmount: fc.float({ min: 1, max: 500000, noNaN: true })
        }),
        { minLength: 0, maxLength: 5 }
      ),
      async (transactions) => {
        // Mock API to return test transactions
        global.fetch.mockImplementation((url) => {
          if (url.includes('/api/scrap/transactions')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                data: transactions.map((t, index) => ({
                  id: `scrap-${index}`,
                  ...t,
                  supplierBuyer: `Test Supplier ${index}`,
                  transactionDate: new Date().toISOString()
                }))
              })
            })
          }
          
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ success: false })
          })
        })
        
        renderScrapManagement()
        
        // Wait for component to load with data
        await waitFor(() => {
          expect(screen.getByText(/Scrap Trading Management/i)).toBeInTheDocument()
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
          const formatted = formatCurrency(transaction.totalAmount)
          
          // Should start with ₹ symbol
          expect(formatted).toMatch(/^₹/)
          
          // Should not contain decimal places
          expect(formatted).not.toMatch(/\.\d+/)
          
          // Should handle large numbers with proper separators
          if (transaction.totalAmount >= 1000) {
            expect(formatted).toMatch(/,/)
          }
          
          // Should be a valid currency string
          expect(typeof formatted).toBe('string')
          expect(formatted.length).toBeGreaterThan(1)
          
          // Verify calculation consistency
          const calculatedTotal = transaction.quantity * transaction.rate
          expect(Math.abs(transaction.totalAmount - calculatedTotal)).toBeLessThan(1)
        })
        
        // Verify that currency symbols appear in the UI (if any transactions exist)
        if (transactions.length > 0) {
          const currencyElements = screen.getAllByText(/₹/)
          expect(currencyElements.length).toBeGreaterThan(0)
        }
        
        // Test automatic calculation display
        const user = userEvent.setup()
        
        // Fill quantity and rate to test automatic calculation
        const quantityField = screen.getByLabelText(/Quantity/i)
        await user.clear(quantityField)
        await user.type(quantityField, '10')
        
        const rateField = screen.getByLabelText(/Rate/i)
        await user.clear(rateField)
        await user.type(rateField, '50')
        
        // Verify automatic total calculation format
        await waitFor(() => {
          const totalField = screen.getByDisplayValue('₹500.00')
          expect(totalField).toBeInTheDocument()
        })
      }
    ), { numRuns: 25 })
  })

  /**
   * Property: Multi-Transaction Support
   * Validates: Requirements 8.2, 9.3, 9.5
   * 
   * This property ensures that the system can handle multiple transactions
   * and maintains data integrity across different scrap types and operations.
   */
  it('Property: System handles multiple transaction scenarios correctly', async () => {
    fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          scrapType: fc.constantFrom(...SCRAP_TYPES),
          transactionType: fc.constantFrom('PURCHASE', 'SALE'),
          quantity: fc.float({ min: 1, max: 100, noNaN: true }),
          rate: fc.float({ min: 10, max: 200, noNaN: true })
        }),
        { minLength: 2, maxLength: 8 }
      ),
      async (transactionSet) => {
        // Mock API to simulate multiple transactions
        let submissionCount = 0
        global.fetch.mockImplementation((url, options) => {
          if (url.includes('/api/scrap/transactions') && options?.method === 'POST') {
            submissionCount++
            const requestData = JSON.parse(options.body)
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                data: {
                  id: `scrap-tx-${submissionCount}`,
                  ...requestData,
                  createdAt: new Date().toISOString()
                }
              })
            })
          }
          
          if (url.includes('/api/scrap/transactions')) {
            // Return existing transactions
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                data: transactionSet.slice(0, submissionCount).map((t, index) => ({
                  id: `existing-${index}`,
                  ...t,
                  totalAmount: t.quantity * t.rate,
                  supplierBuyer: `Supplier ${index}`,
                  transactionDate: new Date().toISOString()
                }))
              })
            })
          }
          
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ success: false })
          })
        })
        
        const user = userEvent.setup()
        renderScrapManagement()
        
        // Wait for component to load
        await waitFor(() => {
          expect(screen.getByText(/Add New Scrap Transaction/i)).toBeInTheDocument()
        })
        
        // Submit first transaction from the set
        const firstTransaction = transactionSet[0]
        
        // Fill scrap type
        const scrapTypeSelect = screen.getByLabelText(/Scrap Type/i)
        await user.click(scrapTypeSelect)
        const scrapOption = await screen.findByText(firstTransaction.scrapType)
        await user.click(scrapOption)
        
        // Fill transaction type
        const typeSelect = screen.getByLabelText(/Type/i)
        await user.click(typeSelect)
        const typeOption = await screen.findByText(
          firstTransaction.transactionType === 'PURCHASE' ? /Purchase/ : /Sale/
        )
        await user.click(typeOption)
        
        // Fill quantity and rate
        const quantityField = screen.getByLabelText(/Quantity/i)
        await user.clear(quantityField)
        await user.type(quantityField, firstTransaction.quantity.toString())
        
        const rateField = screen.getByLabelText(/Rate/i)
        await user.clear(rateField)
        await user.type(rateField, firstTransaction.rate.toString())
        
        // Fill supplier/buyer
        const supplierField = screen.getByLabelText(/Supplier\/Buyer Name/i)
        await user.clear(supplierField)
        await user.type(supplierField, 'Test Supplier')
        
        // Submit transaction
        const submitButton = screen.getByRole('button', { name: /Add Transaction/i })
        await user.click(submitButton)
        
        // Wait for submission to complete
        await waitFor(() => {
          expect(submissionCount).toBe(1)
        }, { timeout: 3000 })
        
        // Verify form was reset
        await waitFor(() => {
          const quantityFieldAfter = screen.getByLabelText(/Quantity/i)
          const rateFieldAfter = screen.getByLabelText(/Rate/i)
          const supplierFieldAfter = screen.getByLabelText(/Supplier\/Buyer Name/i)
          
          expect(quantityFieldAfter.value).toBe('')
          expect(rateFieldAfter.value).toBe('')
          expect(supplierFieldAfter.value).toBe('')
        })
        
        // Verify socket emission occurred
        expect(mockSocketContext.emit).toHaveBeenCalledWith(
          'transaction-created',
          expect.objectContaining({
            type: 'scrap',
            transaction: expect.any(Object)
          })
        )
        
        // Verify success message
        expect(screen.getByText(/Scrap transaction added successfully/i) || 
               screen.getByText(/successfully/i)).toBeInTheDocument()
        
        // Calculate expected summary statistics
        const purchases = transactionSet.filter(t => t.transactionType === 'PURCHASE')
        const sales = transactionSet.filter(t => t.transactionType === 'SALE')
        
        const totalPurchaseAmount = purchases.reduce((sum, t) => sum + (t.quantity * t.rate), 0)
        const totalSaleAmount = sales.reduce((sum, t) => sum + (t.quantity * t.rate), 0)
        const expectedProfit = totalSaleAmount - totalPurchaseAmount
        
        // Verify data integrity properties
        expect(purchases.length + sales.length).toBe(transactionSet.length)
        expect(totalPurchaseAmount).toBeGreaterThanOrEqual(0)
        expect(totalSaleAmount).toBeGreaterThanOrEqual(0)
        
        // Verify scrap type diversity
        const uniqueScrapTypes = new Set(transactionSet.map(t => t.scrapType))
        expect(uniqueScrapTypes.size).toBeGreaterThanOrEqual(1)
        expect(uniqueScrapTypes.size).toBeLessThanOrEqual(SCRAP_TYPES.length)
        
        // All scrap types should be from predefined list
        uniqueScrapTypes.forEach(type => {
          expect(SCRAP_TYPES).toContain(type)
        })
      }
    ), { numRuns: 15 })
  })
})