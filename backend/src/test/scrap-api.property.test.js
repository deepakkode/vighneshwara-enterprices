import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import request from 'supertest'
import app from '../server.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Predefined scrap types from the API
const SCRAP_TYPES = [
  'KB_WASTE',
  'OTB', 
  'NB',
  'WRD',
  'HHT_ONP',
  'GTB',
  'BB',
  'ROAD_WASTE_PLASTIC',
  'DUPLEX_WASTE',
  'PLASTIC',
  'BLOCK_MATERIAL',
  'WASTE_PLASTIC'
]

describe('Scrap API Property Tests', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.scrapTransaction.deleteMany()
    await prisma.dailySummary.deleteMany()
  })

  afterEach(async () => {
    // Clean up database after each test
    await prisma.scrapTransaction.deleteMany()
    await prisma.dailySummary.deleteMany()
  })

  /**
   * Property 2: Transaction Amount Calculation
   * Feature: income-dashboard, Property 2: For any scrap transaction (purchase or sale), the total amount should always equal quantity multiplied by rate, regardless of the specific values entered
   * Validates: Requirements 8.3, 9.2
   */
  it('should calculate total amount as quantity × rate for all scrap transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          transactionType: fc.constantFrom('PURCHASE', 'SALE'),
          partyName: fc.string({ minLength: 1, maxLength: 50 }),
          scrapType: fc.constantFrom(...SCRAP_TYPES),
          quantity: fc.float({ min: 0.001, max: 1000, noNaN: true }),
          rate: fc.float({ min: 0.01, max: 10000, noNaN: true }),
          transactionDate: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
          partyAddress: fc.option(fc.string({ maxLength: 100 })),
          hsnCode: fc.option(fc.string({ maxLength: 8 }))
        }),
        async (transactionData) => {
          const requestData = {
            transactionType: transactionData.transactionType,
            partyName: transactionData.partyName,
            scrapType: transactionData.scrapType,
            quantity: transactionData.quantity,
            rate: transactionData.rate,
            transactionDate: transactionData.transactionDate.toISOString(),
            partyAddress: transactionData.partyAddress || 'Test Address',
            hsnCode: transactionData.hsnCode || '1234'
          }

          // Calculate expected total amount
          const expectedTotalAmount = transactionData.quantity * transactionData.rate

          // Create the transaction
          const response = await request(app)
            .post('/api/scrap')
            .send(requestData)
            .expect(201)

          expect(response.body.success).toBe(true)
          expect(response.body.data).toBeDefined()

          // Verify the total amount calculation
          const actualTotalAmount = parseFloat(response.body.data.totalAmount)
          expect(actualTotalAmount).toBeCloseTo(expectedTotalAmount, 2)

          // Verify the calculation is consistent when retrieving the transaction
          const getResponse = await request(app)
            .get(`/api/scrap/${response.body.data.id}`)
            .expect(200)

          const retrievedTotalAmount = parseFloat(getResponse.body.data.totalAmount)
          expect(retrievedTotalAmount).toBeCloseTo(expectedTotalAmount, 2)
          expect(retrievedTotalAmount).toBeCloseTo(actualTotalAmount, 2)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5: Scrap Type Consistency
   * Feature: income-dashboard, Property 5: For any scrap transaction, the system should support exactly the same predefined scrap types for both purchases and sales, ensuring consistency across all operations
   * Validates: Requirements 8.2, 9.3
   */
  it('should support the same scrap types for both purchases and sales consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          scrapType: fc.constantFrom(...SCRAP_TYPES),
          purchaseData: fc.record({
            partyName: fc.string({ minLength: 1, maxLength: 50 }),
            quantity: fc.float({ min: 0.001, max: 100, noNaN: true }),
            rate: fc.float({ min: 0.01, max: 1000, noNaN: true }),
            transactionDate: fc.date({ min: new Date('2024-01-01'), max: new Date() })
          }),
          saleData: fc.record({
            partyName: fc.string({ minLength: 1, maxLength: 50 }),
            quantity: fc.float({ min: 0.001, max: 100, noNaN: true }),
            rate: fc.float({ min: 0.01, max: 1000, noNaN: true }),
            transactionDate: fc.date({ min: new Date('2024-01-01'), max: new Date() })
          })
        }),
        async ({ scrapType, purchaseData, saleData }) => {
          // Create a purchase transaction with the scrap type
          const purchaseRequest = {
            transactionType: 'PURCHASE',
            partyName: purchaseData.partyName,
            scrapType: scrapType,
            quantity: purchaseData.quantity,
            rate: purchaseData.rate,
            transactionDate: purchaseData.transactionDate.toISOString(),
            partyAddress: 'Test Purchase Address'
          }

          const purchaseResponse = await request(app)
            .post('/api/scrap')
            .send(purchaseRequest)
            .expect(201)

          expect(purchaseResponse.body.success).toBe(true)
          expect(purchaseResponse.body.data.scrapType).toBe(scrapType)
          expect(purchaseResponse.body.data.transactionType).toBe('PURCHASE')

          // Create a sale transaction with the same scrap type
          const saleRequest = {
            transactionType: 'SALE',
            partyName: saleData.partyName,
            scrapType: scrapType,
            quantity: saleData.quantity,
            rate: saleData.rate,
            transactionDate: saleData.transactionDate.toISOString(),
            partyAddress: 'Test Sale Address'
          }

          const saleResponse = await request(app)
            .post('/api/scrap')
            .send(saleRequest)
            .expect(201)

          expect(saleResponse.body.success).toBe(true)
          expect(saleResponse.body.data.scrapType).toBe(scrapType)
          expect(saleResponse.body.data.transactionType).toBe('SALE')

          // Verify both transactions can be retrieved and filtered by scrap type
          const filterResponse = await request(app)
            .get(`/api/scrap?scrapType=${scrapType}`)
            .expect(200)

          expect(filterResponse.body.success).toBe(true)
          expect(filterResponse.body.data.length).toBe(2)

          // Verify both purchase and sale are present
          const transactions = filterResponse.body.data
          const purchaseTransaction = transactions.find(t => t.transactionType === 'PURCHASE')
          const saleTransaction = transactions.find(t => t.transactionType === 'SALE')

          expect(purchaseTransaction).toBeDefined()
          expect(saleTransaction).toBeDefined()
          expect(purchaseTransaction.scrapType).toBe(scrapType)
          expect(saleTransaction.scrapType).toBe(scrapType)

          // Verify profit summary includes both transactions
          const summaryResponse = await request(app)
            .get('/api/scrap/profit/summary')
            .expect(200)

          expect(summaryResponse.body.success).toBe(true)
          const summary = summaryResponse.body.data

          // Verify the scrap type appears in the summary
          expect(summary.byScrapType[scrapType]).toBeDefined()
          expect(summary.byScrapType[scrapType].purchases).toBeCloseTo(purchaseData.quantity * purchaseData.rate, 2)
          expect(summary.byScrapType[scrapType].sales).toBeCloseTo(saleData.quantity * saleData.rate, 2)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 12: Multi-Transaction Support
   * Feature: income-dashboard, Property 12: For any day, the system should support recording multiple transactions of the same type (multiple sales, multiple expenses) and correctly aggregate them in daily totals
   * Validates: Requirements 9.5
   */
  it('should support multiple transactions of the same type and aggregate them correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          transactionType: fc.constantFrom('PURCHASE', 'SALE'),
          transactionDate: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
          transactions: fc.array(
            fc.record({
              partyName: fc.string({ minLength: 1, maxLength: 50 }),
              scrapType: fc.constantFrom(...SCRAP_TYPES),
              quantity: fc.float({ min: 0.001, max: 100, noNaN: true }),
              rate: fc.float({ min: 0.01, max: 1000, noNaN: true })
            }),
            { minLength: 2, maxLength: 5 }
          )
        }),
        async ({ transactionType, transactionDate, transactions }) => {
          let expectedTotalAmount = 0
          const createdTransactions = []

          // Create multiple transactions of the same type on the same date
          for (const transaction of transactions) {
            const requestData = {
              transactionType,
              partyName: transaction.partyName,
              scrapType: transaction.scrapType,
              quantity: transaction.quantity,
              rate: transaction.rate,
              transactionDate: transactionDate.toISOString(),
              partyAddress: 'Test Address'
            }

            const expectedAmount = transaction.quantity * transaction.rate
            expectedTotalAmount += expectedAmount

            const response = await request(app)
              .post('/api/scrap')
              .send(requestData)
              .expect(201)

            expect(response.body.success).toBe(true)
            expect(parseFloat(response.body.data.totalAmount)).toBeCloseTo(expectedAmount, 2)
            
            createdTransactions.push(response.body.data)
          }

          // Verify all transactions are stored correctly
          const allTransactionsResponse = await request(app)
            .get('/api/scrap')
            .expect(200)

          expect(allTransactionsResponse.body.success).toBe(true)
          expect(allTransactionsResponse.body.data.length).toBe(transactions.length)

          // Filter transactions by type and date
          const startDate = new Date(transactionDate)
          startDate.setHours(0, 0, 0, 0)
          const endDate = new Date(transactionDate)
          endDate.setHours(23, 59, 59, 999)

          const filteredResponse = await request(app)
            .get(`/api/scrap?transactionType=${transactionType}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
            .expect(200)

          expect(filteredResponse.body.success).toBe(true)
          expect(filteredResponse.body.data.length).toBe(transactions.length)

          // Verify profit summary aggregates correctly
          const summaryResponse = await request(app)
            .get(`/api/scrap/profit/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
            .expect(200)

          expect(summaryResponse.body.success).toBe(true)
          const summary = summaryResponse.body.data

          if (transactionType === 'PURCHASE') {
            expect(summary.totalPurchases).toBeCloseTo(expectedTotalAmount, 2)
            expect(summary.totalSales).toBe(0)
            expect(summary.totalProfit).toBeCloseTo(-expectedTotalAmount, 2)
          } else {
            expect(summary.totalSales).toBeCloseTo(expectedTotalAmount, 2)
            expect(summary.totalPurchases).toBe(0)
            expect(summary.totalProfit).toBeCloseTo(expectedTotalAmount, 2)
          }

          expect(summary.transactionCount).toBe(transactions.length)

          // Verify daily summary is updated correctly
          const dailySummary = await prisma.dailySummary.findUnique({
            where: { date: startDate }
          })

          expect(dailySummary).toBeDefined()
          
          if (transactionType === 'PURCHASE') {
            expect(Number(dailySummary.scrapPurchases)).toBeCloseTo(expectedTotalAmount, 2)
            expect(Number(dailySummary.scrapSales)).toBe(0)
            expect(Number(dailySummary.scrapProfit)).toBeCloseTo(-expectedTotalAmount, 2)
          } else {
            expect(Number(dailySummary.scrapSales)).toBeCloseTo(expectedTotalAmount, 2)
            expect(Number(dailySummary.scrapPurchases)).toBe(0)
            expect(Number(dailySummary.scrapProfit)).toBeCloseTo(expectedTotalAmount, 2)
          }

          expect(dailySummary.transactionCount).toBe(transactions.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})