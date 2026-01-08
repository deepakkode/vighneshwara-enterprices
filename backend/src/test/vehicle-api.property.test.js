import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import request from 'supertest'
import app from '../server.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Vehicle API Property Tests', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.vehicleTransaction.deleteMany()
    await prisma.vehicle.deleteMany()
    await prisma.dailySummary.deleteMany()
  })

  afterEach(async () => {
    // Clean up database after each test
    await prisma.vehicleTransaction.deleteMany()
    await prisma.vehicle.deleteMany()
    await prisma.dailySummary.deleteMany()
  })

  /**
   * Property 1: Automatic Calculation Updates
   * Feature: income-dashboard, Property 1: For any business transaction (vehicle income/expense), when the transaction is recorded, all related totals and profit calculations should be updated immediately and correctly reflect the new data
   * Validates: Requirements 1.5, 2.4, 3.2
   */
  it('should automatically update calculations when vehicle transactions are recorded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          vehicleType: fc.constantFrom('LORRY', 'TRUCK_AUTO'),
          transactionType: fc.constantFrom('INCOME', 'EXPENSE'),
          amount: fc.float({ min: 1, max: 50000, noNaN: true }),
          transactionDate: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
          incomeType: fc.option(fc.constantFrom('RENTAL', 'TRANSPORTATION')),
          expenseType: fc.option(fc.constantFrom('PETROL', 'MAINTENANCE', 'REPAIRS', 'OTHER')),
          description: fc.option(fc.string({ maxLength: 100 }))
        }),
        async (transactionData) => {
          // Create a vehicle first
          const vehicle = await prisma.vehicle.create({
            data: {
              vehicleType: transactionData.vehicleType,
              vehicleNumber: `TEST-${Math.random().toString(36).substr(2, 9)}`
            }
          })

          // Prepare transaction data
          const requestData = {
            vehicleId: vehicle.id,
            transactionType: transactionData.transactionType,
            amount: transactionData.amount,
            transactionDate: transactionData.transactionDate.toISOString(),
            description: transactionData.description || 'Test transaction'
          }

          // Add type-specific fields
          if (transactionData.transactionType === 'INCOME') {
            requestData.incomeType = transactionData.incomeType || 'RENTAL'
          } else {
            requestData.expenseType = transactionData.expenseType || 'PETROL'
          }

          // Get daily summary before transaction
          const dateKey = new Date(transactionData.transactionDate)
          dateKey.setHours(0, 0, 0, 0)
          
          const summaryBefore = await prisma.dailySummary.findUnique({
            where: { date: dateKey }
          })

          // Create the transaction
          const response = await request(app)
            .post('/api/vehicles/transactions')
            .send(requestData)
            .expect(201)

          expect(response.body.success).toBe(true)
          expect(response.body.data).toBeDefined()

          // Get daily summary after transaction
          const summaryAfter = await prisma.dailySummary.findUnique({
            where: { date: dateKey }
          })

          expect(summaryAfter).toBeDefined()

          // Verify calculations were updated
          const expectedChange = transactionData.amount
          const isLorry = transactionData.vehicleType === 'LORRY'
          const isIncome = transactionData.transactionType === 'INCOME'

          if (isIncome) {
            if (isLorry) {
              const expectedIncome = (summaryBefore?.lorryIncome || 0) + expectedChange
              expect(Number(summaryAfter.lorryIncome)).toBeCloseTo(expectedIncome, 2)
            } else {
              const expectedIncome = (summaryBefore?.truckAutoIncome || 0) + expectedChange
              expect(Number(summaryAfter.truckAutoIncome)).toBeCloseTo(expectedIncome, 2)
            }
          } else {
            if (isLorry) {
              const expectedExpenses = (summaryBefore?.lorryExpenses || 0) + expectedChange
              expect(Number(summaryAfter.lorryExpenses)).toBeCloseTo(expectedExpenses, 2)
            } else {
              const expectedExpenses = (summaryBefore?.truckAutoExpenses || 0) + expectedChange
              expect(Number(summaryAfter.truckAutoExpenses)).toBeCloseTo(expectedExpenses, 2)
            }
          }

          // Verify profit calculations
          const expectedLorryProfit = Number(summaryAfter.lorryIncome) - Number(summaryAfter.lorryExpenses)
          const expectedTruckAutoProfit = Number(summaryAfter.truckAutoIncome) - Number(summaryAfter.truckAutoExpenses)
          const expectedTotalVehicleProfit = expectedLorryProfit + expectedTruckAutoProfit

          expect(Number(summaryAfter.lorryProfit)).toBeCloseTo(expectedLorryProfit, 2)
          expect(Number(summaryAfter.truckAutoProfit)).toBeCloseTo(expectedTruckAutoProfit, 2)
          expect(Number(summaryAfter.totalVehicleProfit)).toBeCloseTo(expectedTotalVehicleProfit, 2)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3: Profit Calculation Accuracy
   * Feature: income-dashboard, Property 3: For any time period and business area (vehicle operations), the calculated profit should always equal total income minus total expenses for that period and area
   * Validates: Requirements 3.1, 10.1, 11.1
   */
  it('should calculate vehicle profit accurately as income minus expenses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            vehicleType: fc.constantFrom('LORRY', 'TRUCK_AUTO'),
            transactionType: fc.constantFrom('INCOME', 'EXPENSE'),
            amount: fc.float({ min: 1, max: 10000, noNaN: true }),
            transactionDate: fc.date({ min: new Date('2024-01-01'), max: new Date() })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (transactions) => {
          // Create vehicles
          const lorryVehicle = await prisma.vehicle.create({
            data: {
              vehicleType: 'LORRY',
              vehicleNumber: `LORRY-${Math.random().toString(36).substr(2, 9)}`
            }
          })

          const truckAutoVehicle = await prisma.vehicle.create({
            data: {
              vehicleType: 'TRUCK_AUTO',
              vehicleNumber: `TRUCK-${Math.random().toString(36).substr(2, 9)}`
            }
          })

          // Track expected totals
          let expectedLorryIncome = 0
          let expectedLorryExpenses = 0
          let expectedTruckAutoIncome = 0
          let expectedTruckAutoExpenses = 0

          // Create all transactions
          for (const transaction of transactions) {
            const vehicleId = transaction.vehicleType === 'LORRY' ? lorryVehicle.id : truckAutoVehicle.id
            
            const requestData = {
              vehicleId,
              transactionType: transaction.transactionType,
              amount: transaction.amount,
              transactionDate: transaction.transactionDate.toISOString(),
              description: 'Property test transaction'
            }

            // Add type-specific fields
            if (transaction.transactionType === 'INCOME') {
              requestData.incomeType = 'RENTAL'
            } else {
              requestData.expenseType = 'PETROL'
            }

            // Update expected totals
            if (transaction.vehicleType === 'LORRY') {
              if (transaction.transactionType === 'INCOME') {
                expectedLorryIncome += transaction.amount
              } else {
                expectedLorryExpenses += transaction.amount
              }
            } else {
              if (transaction.transactionType === 'INCOME') {
                expectedTruckAutoIncome += transaction.amount
              } else {
                expectedTruckAutoExpenses += transaction.amount
              }
            }

            await request(app)
              .post('/api/vehicles/transactions')
              .send(requestData)
              .expect(201)
          }

          // Get profit summary
          const response = await request(app)
            .get('/api/vehicles/profit/summary')
            .expect(200)

          expect(response.body.success).toBe(true)
          const summary = response.body.data

          // Verify profit calculations
          const expectedLorryProfit = expectedLorryIncome - expectedLorryExpenses
          const expectedTruckAutoProfit = expectedTruckAutoIncome - expectedTruckAutoExpenses
          const expectedTotalProfit = expectedLorryProfit + expectedTruckAutoProfit

          expect(summary.byVehicleType.LORRY.income).toBeCloseTo(expectedLorryIncome, 2)
          expect(summary.byVehicleType.LORRY.expenses).toBeCloseTo(expectedLorryExpenses, 2)
          expect(summary.byVehicleType.LORRY.profit).toBeCloseTo(expectedLorryProfit, 2)

          expect(summary.byVehicleType.TRUCK_AUTO.income).toBeCloseTo(expectedTruckAutoIncome, 2)
          expect(summary.byVehicleType.TRUCK_AUTO.expenses).toBeCloseTo(expectedTruckAutoExpenses, 2)
          expect(summary.byVehicleType.TRUCK_AUTO.profit).toBeCloseTo(expectedTruckAutoProfit, 2)

          expect(summary.totalProfit).toBeCloseTo(expectedTotalProfit, 2)
          expect(summary.totalIncome).toBeCloseTo(expectedLorryIncome + expectedTruckAutoIncome, 2)
          expect(summary.totalExpenses).toBeCloseTo(expectedLorryExpenses + expectedTruckAutoExpenses, 2)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6: Vehicle Data Separation
   * Feature: income-dashboard, Property 6: For any vehicle transaction, the data should be correctly associated with the specific vehicle (lorry or truck/auto) and calculations should remain separate between vehicles
   * Validates: Requirements 3.3, 6.3
   */
  it('should maintain separate data and calculations for different vehicles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          lorryTransactions: fc.array(
            fc.record({
              transactionType: fc.constantFrom('INCOME', 'EXPENSE'),
              amount: fc.float({ min: 1, max: 5000, noNaN: true }),
              transactionDate: fc.date({ min: new Date('2024-01-01'), max: new Date() })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          truckAutoTransactions: fc.array(
            fc.record({
              transactionType: fc.constantFrom('INCOME', 'EXPENSE'),
              amount: fc.float({ min: 1, max: 5000, noNaN: true }),
              transactionDate: fc.date({ min: new Date('2024-01-01'), max: new Date() })
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        async ({ lorryTransactions, truckAutoTransactions }) => {
          // Create vehicles
          const lorryVehicle = await prisma.vehicle.create({
            data: {
              vehicleType: 'LORRY',
              vehicleNumber: `LORRY-${Math.random().toString(36).substr(2, 9)}`
            }
          })

          const truckAutoVehicle = await prisma.vehicle.create({
            data: {
              vehicleType: 'TRUCK_AUTO',
              vehicleNumber: `TRUCK-${Math.random().toString(36).substr(2, 9)}`
            }
          })

          // Create lorry transactions
          for (const transaction of lorryTransactions) {
            const requestData = {
              vehicleId: lorryVehicle.id,
              transactionType: transaction.transactionType,
              amount: transaction.amount,
              transactionDate: transaction.transactionDate.toISOString(),
              description: 'Lorry transaction'
            }

            if (transaction.transactionType === 'INCOME') {
              requestData.incomeType = 'RENTAL'
            } else {
              requestData.expenseType = 'PETROL'
            }

            await request(app)
              .post('/api/vehicles/transactions')
              .send(requestData)
              .expect(201)
          }

          // Create truck/auto transactions
          for (const transaction of truckAutoTransactions) {
            const requestData = {
              vehicleId: truckAutoVehicle.id,
              transactionType: transaction.transactionType,
              amount: transaction.amount,
              transactionDate: transaction.transactionDate.toISOString(),
              description: 'Truck/Auto transaction'
            }

            if (transaction.transactionType === 'INCOME') {
              requestData.incomeType = 'TRANSPORTATION'
            } else {
              requestData.expenseType = 'MAINTENANCE'
            }

            await request(app)
              .post('/api/vehicles/transactions')
              .send(requestData)
              .expect(201)
          }

          // Get transactions for each vehicle separately
          const lorryResponse = await request(app)
            .get(`/api/vehicles/${lorryVehicle.id}`)
            .expect(200)

          const truckAutoResponse = await request(app)
            .get(`/api/vehicles/${truckAutoVehicle.id}`)
            .expect(200)

          // Verify vehicle data separation
          const lorryData = lorryResponse.body.data
          const truckAutoData = truckAutoResponse.body.data

          expect(lorryData.vehicleType).toBe('LORRY')
          expect(truckAutoData.vehicleType).toBe('TRUCK_AUTO')

          // Verify transaction counts match
          expect(lorryData.transactions.length).toBe(lorryTransactions.length)
          expect(truckAutoData.transactions.length).toBe(truckAutoTransactions.length)

          // Verify all lorry transactions belong to lorry
          lorryData.transactions.forEach(transaction => {
            expect(transaction.vehicleId).toBe(lorryVehicle.id)
            expect(transaction.vehicle.vehicleType).toBe('LORRY')
          })

          // Verify all truck/auto transactions belong to truck/auto
          truckAutoData.transactions.forEach(transaction => {
            expect(transaction.vehicleId).toBe(truckAutoVehicle.id)
            expect(transaction.vehicle.vehicleType).toBe('TRUCK_AUTO')
          })

          // Get profit summary and verify separation
          const summaryResponse = await request(app)
            .get('/api/vehicles/profit/summary')
            .expect(200)

          const summary = summaryResponse.body.data

          // Calculate expected totals for verification
          let expectedLorryIncome = 0, expectedLorryExpenses = 0
          let expectedTruckAutoIncome = 0, expectedTruckAutoExpenses = 0

          lorryTransactions.forEach(t => {
            if (t.transactionType === 'INCOME') expectedLorryIncome += t.amount
            else expectedLorryExpenses += t.amount
          })

          truckAutoTransactions.forEach(t => {
            if (t.transactionType === 'INCOME') expectedTruckAutoIncome += t.amount
            else expectedTruckAutoExpenses += t.amount
          })

          // Verify calculations are separate and correct
          expect(summary.byVehicleType.LORRY.income).toBeCloseTo(expectedLorryIncome, 2)
          expect(summary.byVehicleType.LORRY.expenses).toBeCloseTo(expectedLorryExpenses, 2)
          expect(summary.byVehicleType.LORRY.profit).toBeCloseTo(expectedLorryIncome - expectedLorryExpenses, 2)

          expect(summary.byVehicleType.TRUCK_AUTO.income).toBeCloseTo(expectedTruckAutoIncome, 2)
          expect(summary.byVehicleType.TRUCK_AUTO.expenses).toBeCloseTo(expectedTruckAutoExpenses, 2)
          expect(summary.byVehicleType.TRUCK_AUTO.profit).toBeCloseTo(expectedTruckAutoIncome - expectedTruckAutoExpenses, 2)

          // Verify no cross-contamination between vehicles
          const lorryProfit = summary.byVehicleType.LORRY.profit
          const truckAutoProfit = summary.byVehicleType.TRUCK_AUTO.profit
          const totalProfit = summary.totalProfit

          expect(totalProfit).toBeCloseTo(lorryProfit + truckAutoProfit, 2)
        }
      ),
      { numRuns: 100 }
    )
  })
})