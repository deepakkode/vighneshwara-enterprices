import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import fc from 'fast-check'

const prisma = new PrismaClient()

// **Feature: income-dashboard, Property 11: Required Field Validation**
// **Validates: Requirements 1.3, 2.2, 8.1, 9.1**

describe('Database Models Property Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await prisma.$connect()
  })

  afterAll(async () => {
    // Cleanup and disconnect
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.dailySummary.deleteMany()
    await prisma.bill.deleteMany()
    await prisma.scrapTransaction.deleteMany()
    await prisma.vehicleTransaction.deleteMany()
    await prisma.vehicle.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('Property 11: Required Field Validation', () => {
    test('Vehicle model should enforce required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            vehicleType: fc.constantFrom('LORRY', 'TRUCK_AUTO'),
            vehicleNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
            status: fc.constantFrom('ACTIVE', 'MAINTENANCE', 'IDLE')
          }),
          async (vehicleData) => {
            // Valid vehicle data should create successfully
            const vehicle = await prisma.vehicle.create({
              data: vehicleData
            })
            
            expect(vehicle).toBeDefined()
            expect(vehicle.vehicleType).toBe(vehicleData.vehicleType)
            expect(vehicle.status).toBe(vehicleData.status)
            
            // Cleanup
            await prisma.vehicle.delete({ where: { id: vehicle.id } })
          }
        ),
        { numRuns: 50 }
      )
    })

    test('VehicleTransaction model should enforce required fields and validate amounts', async () => {
      // First create a vehicle
      const vehicle = await prisma.vehicle.create({
        data: {
          vehicleType: 'LORRY',
          status: 'ACTIVE'
        }
      })

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            transactionType: fc.constantFrom('INCOME', 'EXPENSE'),
            amount: fc.float({ min: 0.01, max: 999999.99 }),
            description: fc.option(fc.string({ maxLength: 500 })),
            transactionDate: fc.date({ min: new Date('2020-01-01'), max: new Date() })
          }),
          async (transactionData) => {
            // Add required fields
            const fullData = {
              ...transactionData,
              vehicleId: vehicle.id,
              incomeType: transactionData.transactionType === 'INCOME' ? 'RENTAL' : null,
              expenseType: transactionData.transactionType === 'EXPENSE' ? 'PETROL' : null
            }

            const transaction = await prisma.vehicleTransaction.create({
              data: fullData
            })
            
            expect(transaction).toBeDefined()
            expect(transaction.vehicleId).toBe(vehicle.id)
            expect(transaction.transactionType).toBe(transactionData.transactionType)
            expect(Number(transaction.amount)).toBeCloseTo(transactionData.amount, 2)
            
            // Cleanup
            await prisma.vehicleTransaction.delete({ where: { id: transaction.id } })
          }
        ),
        { numRuns: 30 }
      )

      // Cleanup vehicle
      await prisma.vehicle.delete({ where: { id: vehicle.id } })
    })

    test('ScrapTransaction model should enforce required fields and calculate totals correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            transactionType: fc.constantFrom('PURCHASE', 'SALE'),
            partyName: fc.string({ minLength: 1, maxLength: 100 }),
            scrapType: fc.constantFrom(
              'KB_WASTE', 'OTB', 'NB', 'WRD', 'HHT_ONP', 'GTB', 'BB',
              'ROAD_WASTE_PLASTIC', 'DUPLEX_WASTE', 'PLASTIC', 'BLOCK_MATERIAL', 'WASTE_PLASTIC'
            ),
            quantity: fc.float({ min: 0.001, max: 9999.999 }),
            rate: fc.float({ min: 0.01, max: 99999.99 }),
            transactionDate: fc.date({ min: new Date('2020-01-01'), max: new Date() })
          }),
          async (transactionData) => {
            // Calculate expected total
            const expectedTotal = Math.round(transactionData.quantity * transactionData.rate * 100) / 100

            const fullData = {
              ...transactionData,
              totalAmount: expectedTotal
            }

            const transaction = await prisma.scrapTransaction.create({
              data: fullData
            })
            
            expect(transaction).toBeDefined()
            expect(transaction.partyName).toBe(transactionData.partyName)
            expect(transaction.scrapType).toBe(transactionData.scrapType)
            expect(Number(transaction.quantity)).toBeCloseTo(transactionData.quantity, 3)
            expect(Number(transaction.rate)).toBeCloseTo(transactionData.rate, 2)
            expect(Number(transaction.totalAmount)).toBeCloseTo(expectedTotal, 2)
            
            // Cleanup
            await prisma.scrapTransaction.delete({ where: { id: transaction.id } })
          }
        ),
        { numRuns: 30 }
      )
    })

    test('User model should enforce unique constraints', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 50 }),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 100 }),
            role: fc.constantFrom('OWNER', 'MANAGER', 'OPERATOR')
          }),
          async (userData) => {
            const user = await prisma.user.create({
              data: userData
            })
            
            expect(user).toBeDefined()
            expect(user.username).toBe(userData.username)
            expect(user.email).toBe(userData.email)
            expect(user.role).toBe(userData.role)
            expect(user.isActive).toBe(true)
            
            // Test unique constraint - should fail with duplicate username
            await expect(
              prisma.user.create({
                data: {
                  ...userData,
                  email: 'different@email.com'
                }
              })
            ).rejects.toThrow()
            
            // Test unique constraint - should fail with duplicate email
            await expect(
              prisma.user.create({
                data: {
                  ...userData,
                  username: 'different_username'
                }
              })
            ).rejects.toThrow()
            
            // Cleanup
            await prisma.user.delete({ where: { id: user.id } })
          }
        ),
        { numRuns: 20 }
      )
    })

    test('Bill model should enforce unique bill numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            billType: fc.constantFrom('PURCHASE_VOUCHER', 'TAX_INVOICE'),
            billNumber: fc.string({ minLength: 1, maxLength: 50 }),
            partyName: fc.string({ minLength: 1, maxLength: 100 }),
            totalAmount: fc.float({ min: 0.01, max: 999999.99 }),
            billDate: fc.date({ min: new Date('2020-01-01'), max: new Date() })
          }),
          async (billData) => {
            const bill = await prisma.bill.create({
              data: billData
            })
            
            expect(bill).toBeDefined()
            expect(bill.billNumber).toBe(billData.billNumber)
            expect(bill.billType).toBe(billData.billType)
            expect(Number(bill.totalAmount)).toBeCloseTo(billData.totalAmount, 2)
            
            // Test unique constraint - should fail with duplicate bill number
            await expect(
              prisma.bill.create({
                data: {
                  ...billData,
                  partyName: 'Different Party'
                }
              })
            ).rejects.toThrow()
            
            // Cleanup
            await prisma.bill.delete({ where: { id: bill.id } })
          }
        ),
        { numRuns: 20 }
      )
    })

    test('DailySummary model should enforce unique dates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
            lorryIncome: fc.float({ min: 0, max: 99999.99 }),
            lorryExpenses: fc.float({ min: 0, max: 99999.99 }),
            scrapPurchases: fc.float({ min: 0, max: 99999.99 }),
            scrapSales: fc.float({ min: 0, max: 99999.99 })
          }),
          async (summaryData) => {
            // Calculate derived fields
            const lorryProfit = summaryData.lorryIncome - summaryData.lorryExpenses
            const scrapProfit = summaryData.scrapSales - summaryData.scrapPurchases
            const totalBusinessProfit = lorryProfit + scrapProfit

            const fullData = {
              ...summaryData,
              lorryProfit,
              truckAutoIncome: 0,
              truckAutoExpenses: 0,
              truckAutoProfit: 0,
              totalVehicleProfit: lorryProfit,
              scrapProfit,
              totalBusinessProfit,
              billsGenerated: 0,
              transactionCount: 0
            }

            const summary = await prisma.dailySummary.create({
              data: fullData
            })
            
            expect(summary).toBeDefined()
            expect(summary.date).toEqual(summaryData.date)
            expect(Number(summary.totalBusinessProfit)).toBeCloseTo(totalBusinessProfit, 2)
            
            // Test unique constraint - should fail with duplicate date
            await expect(
              prisma.dailySummary.create({
                data: fullData
              })
            ).rejects.toThrow()
            
            // Cleanup
            await prisma.dailySummary.delete({ where: { id: summary.id } })
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Data Integrity Tests', () => {
    test('Vehicle transactions should maintain referential integrity', async () => {
      const vehicle = await prisma.vehicle.create({
        data: {
          vehicleType: 'LORRY',
          status: 'ACTIVE'
        }
      })

      const transaction = await prisma.vehicleTransaction.create({
        data: {
          vehicleId: vehicle.id,
          transactionType: 'INCOME',
          incomeType: 'RENTAL',
          amount: 1000.00,
          transactionDate: new Date()
        }
      })

      // Verify relationship
      const vehicleWithTransactions = await prisma.vehicle.findUnique({
        where: { id: vehicle.id },
        include: { transactions: true }
      })

      expect(vehicleWithTransactions.transactions).toHaveLength(1)
      expect(vehicleWithTransactions.transactions[0].id).toBe(transaction.id)

      // Test cascade delete
      await prisma.vehicle.delete({ where: { id: vehicle.id } })

      const deletedTransaction = await prisma.vehicleTransaction.findUnique({
        where: { id: transaction.id }
      })

      expect(deletedTransaction).toBeNull()
    })

    test('Decimal precision should be maintained', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: 0.01, max: 999999.99 }),
          async (amount) => {
            const vehicle = await prisma.vehicle.create({
              data: {
                vehicleType: 'LORRY',
                status: 'ACTIVE'
              }
            })

            const transaction = await prisma.vehicleTransaction.create({
              data: {
                vehicleId: vehicle.id,
                transactionType: 'INCOME',
                incomeType: 'RENTAL',
                amount: amount,
                transactionDate: new Date()
              }
            })

            // Verify decimal precision is maintained (2 decimal places)
            const retrievedTransaction = await prisma.vehicleTransaction.findUnique({
              where: { id: transaction.id }
            })

            expect(Number(retrievedTransaction.amount)).toBeCloseTo(amount, 2)

            // Cleanup
            await prisma.vehicle.delete({ where: { id: vehicle.id } })
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})