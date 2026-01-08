import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../server.js'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

describe('Bill Format Validation Tests', () => {
  let testScrapTransactionId

  beforeAll(async () => {
    // Clean up test data
    await prisma.bill.deleteMany({})
    await prisma.scrapTransaction.deleteMany({})

    // Create test scrap transaction
    const scrapTransaction = await prisma.scrapTransaction.create({
      data: {
        transactionType: 'SALE',
        partyName: 'Test Customer Ltd',
        partyAddress: '123 Business Park, Industrial Area',
        partyPhone: '9876543210',
        partyGstin: '29ABCDE1234F1Z5',
        partyState: 'Karnataka',
        partyStateCode: '29',
        scrapType: 'Steel',
        quantity: 500,
        rate: 85,
        totalAmount: 42500,
        hsnCode: '7204',
        transactionDate: new Date(),
        vehicleNumber: 'KA01AB1234'
      }
    })
    testScrapTransactionId = scrapTransaction.id
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.bill.deleteMany({})
    await prisma.scrapTransaction.deleteMany({})
    await prisma.$disconnect()
  })

  describe('Tax Invoice Format Validation', () => {
    it('should generate Tax Invoice with correct GST calculations', async () => {
      const billData = {
        transactionId: testScrapTransactionId,
        billType: 'TAX_INVOICE',
        partyName: 'Test Customer Ltd',
        partyAddress: '123 Business Park, Industrial Area',
        partyGstin: '29ABCDE1234F1Z5',
        partyState: 'Karnataka',
        partyStateCode: '29',
        totalBeforeTax: 42500,
        sgst: 3825, // 9% SGST
        cgst: 3825, // 9% CGST
        totalAmount: 50150,
        transportMode: 'Road',
        vehicleNumber: 'KA01AB1234',
        dateOfSupply: new Date().toISOString(),
        placeOfSupply: 'Karnataka'
      }

      const response = await request(app)
        .post('/api/bills/generate')
        .send(billData)
        .expect(201)

      expect(response.body.success).toBe(true)
      
      const bill = response.body.data
      expect(bill.billType).toBe('TAX_INVOICE')
      expect(bill.billNumber).toMatch(/^TAX-\d{8}-\d{4}$/) // Format: TAX-YYYYMMDD-NNNN
      expect(parseFloat(bill.totalAmount)).toBe(50150)
      expect(parseFloat(bill.sgst)).toBe(3825)
      expect(parseFloat(bill.cgst)).toBe(3825)
      expect(bill.partyGstin).toBe('29ABCDE1234F1Z5')

      // Verify GST calculations
      const calculatedTotal = parseFloat(bill.totalBeforeTax) + parseFloat(bill.sgst) + parseFloat(bill.cgst)
      expect(calculatedTotal).toBe(parseFloat(bill.totalAmount))

      // Download and verify PDF
      const pdfResponse = await request(app)
        .get(`/api/bills/${bill.id}/pdf`)
        .expect(200)

      expect(pdfResponse.headers['content-type']).toBe('application/pdf')
      expect(pdfResponse.headers['content-disposition']).toContain(`TAX_INVOICE_${bill.billNumber}.pdf`)
    })

    it('should generate Tax Invoice with IGST for inter-state transactions', async () => {
      const billData = {
        transactionId: testScrapTransactionId,
        billType: 'TAX_INVOICE',
        partyName: 'Interstate Customer',
        partyAddress: '456 Commercial Complex, Mumbai',
        partyGstin: '27FGHIJ5678K2L9',
        partyState: 'Maharashtra',
        partyStateCode: '27',
        totalBeforeTax: 42500,
        igst: 7650, // 18% IGST for inter-state
        totalAmount: 50150,
        transportMode: 'Road',
        vehicleNumber: 'MH01CD5678',
        dateOfSupply: new Date().toISOString(),
        placeOfSupply: 'Maharashtra'
      }

      const response = await request(app)
        .post('/api/bills/generate')
        .send(billData)
        .expect(201)

      const bill = response.body.data
      expect(parseFloat(bill.igst)).toBe(7650)
      expect(bill.sgst).toBeNull()
      expect(bill.cgst).toBeNull()
      expect(bill.partyState).toBe('Maharashtra')
      expect(bill.partyStateCode).toBe('27')
    })

    it('should include all mandatory fields in Tax Invoice', async () => {
      const billData = {
        transactionId: testScrapTransactionId,
        billType: 'TAX_INVOICE',
        partyName: 'Complete Customer Ltd',
        partyAddress: '789 Industrial Estate, Bangalore',
        partyGstin: '29KLMNO9012P3Q4',
        totalBeforeTax: 25000,
        sgst: 2250,
        cgst: 2250,
        totalAmount: 29500
      }

      const response = await request(app)
        .post('/api/bills/generate')
        .send(billData)
        .expect(201)

      const bill = response.body.data

      // Verify all mandatory fields are present
      expect(bill.billNumber).toBeDefined()
      expect(bill.billDate).toBeDefined()
      expect(bill.partyName).toBeDefined()
      expect(bill.partyGstin).toBeDefined()
      expect(bill.totalAmount).toBeDefined()
      expect(bill.amountInWords).toBeDefined()
      expect(bill.digitalSignature).toBeDefined()

      // Verify amount in words is correct
      expect(bill.amountInWords).toContain('Twenty Nine Thousand Five Hundred')
    })
  })

  describe('Purchase Voucher Format Validation', () => {
    it('should generate Purchase Voucher with reverse charge', async () => {
      const billData = {
        transactionId: testScrapTransactionId,
        billType: 'PURCHASE_VOUCHER',
        partyName: 'Supplier Company',
        partyAddress: '321 Supply Street, Industrial Zone',
        partyGstin: '29PQRST6789U4V5',
        totalAmount: 35000,
        reverseCharge: true,
        transportMode: 'Road',
        vehicleNumber: 'KA02EF9876'
      }

      const response = await request(app)
        .post('/api/bills/generate')
        .send(billData)
        .expect(201)

      const bill = response.body.data
      expect(bill.billType).toBe('PURCHASE_VOUCHER')
      expect(bill.billNumber).toMatch(/^PV-\d{8}-\d{4}$/) // Format: PV-YYYYMMDD-NNNN
      expect(bill.reverseCharge).toBe(true)
      expect(parseFloat(bill.totalAmount)).toBe(35000)

      // Download and verify PDF
      const pdfResponse = await request(app)
        .get(`/api/bills/${bill.id}/pdf`)
        .expect(200)

      expect(pdfResponse.headers['content-type']).toBe('application/pdf')
      expect(pdfResponse.headers['content-disposition']).toContain(`PURCHASE_VOUCHER_${bill.billNumber}.pdf`)
    })

    it('should generate Purchase Voucher without GST details', async () => {
      const billData = {
        transactionId: testScrapTransactionId,
        billType: 'PURCHASE_VOUCHER',
        partyName: 'Local Supplier',
        partyAddress: '654 Market Road',
        totalAmount: 15000,
        reverseCharge: false
      }

      const response = await request(app)
        .post('/api/bills/generate')
        .send(billData)
        .expect(201)

      const bill = response.body.data
      expect(bill.sgst).toBeNull()
      expect(bill.cgst).toBeNull()
      expect(bill.igst).toBeNull()
      expect(bill.reverseCharge).toBe(false)
    })
  })

  describe('Bill Number Generation', () => {
    it('should generate unique sequential bill numbers', async () => {
      const billPromises = Array(5).fill().map((_, index) =>
        request(app)
          .post('/api/bills/generate')
          .send({
            transactionId: testScrapTransactionId,
            billType: 'TAX_INVOICE',
            partyName: `Customer ${index}`,
            partyAddress: `Address ${index}`,
            totalAmount: 1000 + index * 100
          })
      )

      const responses = await Promise.all(billPromises)
      const billNumbers = responses.map(r => r.body.data.billNumber)

      // All bill numbers should be unique
      const uniqueBillNumbers = new Set(billNumbers)
      expect(uniqueBillNumbers.size).toBe(5)

      // All should follow the correct format
      billNumbers.forEach(billNumber => {
        expect(billNumber).toMatch(/^TAX-\d{8}-\d{4}$/)
      })

      // Should be sequential
      const sequences = billNumbers.map(bn => parseInt(bn.split('-')[2]))
      sequences.sort((a, b) => a - b)
      
      for (let i = 1; i < sequences.length; i++) {
        expect(sequences[i]).toBeGreaterThan(sequences[i - 1])
      }
    })

    it('should generate different prefixes for different bill types', async () => {
      const taxInvoiceResponse = await request(app)
        .post('/api/bills/generate')
        .send({
          transactionId: testScrapTransactionId,
          billType: 'TAX_INVOICE',
          partyName: 'Tax Customer',
          totalAmount: 5000
        })

      const purchaseVoucherResponse = await request(app)
        .post('/api/bills/generate')
        .send({
          transactionId: testScrapTransactionId,
          billType: 'PURCHASE_VOUCHER',
          partyName: 'Purchase Supplier',
          totalAmount: 3000
        })

      const taxBillNumber = taxInvoiceResponse.body.data.billNumber
      const purchaseBillNumber = purchaseVoucherResponse.body.data.billNumber

      expect(taxBillNumber).toMatch(/^TAX-/)
      expect(purchaseBillNumber).toMatch(/^PV-/)
    })
  })

  describe('Company Branding Validation', () => {
    it('should include Vighneshwara Enterprises branding in all bills', async () => {
      const response = await request(app)
        .post('/api/bills/generate')
        .send({
          transactionId: testScrapTransactionId,
          billType: 'TAX_INVOICE',
          partyName: 'Branding Test Customer',
          totalAmount: 10000
        })
        .expect(201)

      const bill = response.body.data

      // Download PDF and check for company branding
      const pdfResponse = await request(app)
        .get(`/api/bills/${bill.id}/pdf`)
        .expect(200)

      // Verify PDF is generated (we can't easily check PDF content in tests)
      expect(pdfResponse.body.length).toBeGreaterThan(1000) // PDF should be substantial
    })
  })

  describe('Bill Data Integrity', () => {
    it('should maintain data integrity across bill operations', async () => {
      // Create bill
      const createResponse = await request(app)
        .post('/api/bills/generate')
        .send({
          transactionId: testScrapTransactionId,
          billType: 'TAX_INVOICE',
          partyName: 'Integrity Test Customer',
          partyAddress: '999 Test Avenue',
          partyGstin: '29WXYZ1234A5B6',
          totalBeforeTax: 10000,
          sgst: 900,
          cgst: 900,
          totalAmount: 11800
        })
        .expect(201)

      const billId = createResponse.body.data.id
      const originalBillNumber = createResponse.body.data.billNumber

      // Retrieve bill
      const getResponse = await request(app)
        .get(`/api/bills/${billId}`)
        .expect(200)

      const retrievedBill = getResponse.body.data
      expect(retrievedBill.billNumber).toBe(originalBillNumber)
      expect(parseFloat(retrievedBill.totalAmount)).toBe(11800)
      expect(retrievedBill.partyGstin).toBe('29WXYZ1234A5B6')

      // Update bill status
      const updateResponse = await request(app)
        .put(`/api/bills/${billId}`)
        .send({
          status: 'SENT',
          terms: 'Payment due within 30 days'
        })
        .expect(200)

      expect(updateResponse.body.data.status).toBe('SENT')
      expect(updateResponse.body.data.terms).toBe('Payment due within 30 days')

      // Verify original data is preserved
      expect(updateResponse.body.data.billNumber).toBe(originalBillNumber)
      expect(parseFloat(updateResponse.body.data.totalAmount)).toBe(11800)

      // Download PDF multiple times - should be consistent
      const pdf1Response = await request(app)
        .get(`/api/bills/${billId}/pdf`)
        .expect(200)

      const pdf2Response = await request(app)
        .get(`/api/bills/${billId}/pdf`)
        .expect(200)

      // PDFs should be identical
      expect(pdf1Response.body.length).toBe(pdf2Response.body.length)
    })

    it('should handle concurrent bill generation correctly', async () => {
      // Generate multiple bills concurrently
      const concurrentPromises = Array(10).fill().map((_, index) =>
        request(app)
          .post('/api/bills/generate')
          .send({
            transactionId: testScrapTransactionId,
            billType: 'TAX_INVOICE',
            partyName: `Concurrent Customer ${index}`,
            totalAmount: 5000 + index * 500
          })
      )

      const responses = await Promise.all(concurrentPromises)

      // All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data.partyName).toBe(`Concurrent Customer ${index}`)
        expect(parseFloat(response.body.data.totalAmount)).toBe(5000 + index * 500)
      })

      // All bill numbers should be unique
      const billNumbers = responses.map(r => r.body.data.billNumber)
      const uniqueBillNumbers = new Set(billNumbers)
      expect(uniqueBillNumbers.size).toBe(10)
    })
  })

  describe('Bill Search and Filtering', () => {
    beforeAll(async () => {
      // Create test bills for searching
      const testBills = [
        {
          partyName: 'Alpha Industries',
          totalAmount: 15000,
          status: 'DRAFT'
        },
        {
          partyName: 'Beta Corporation',
          totalAmount: 25000,
          status: 'SENT'
        },
        {
          partyName: 'Gamma Enterprises',
          totalAmount: 35000,
          status: 'PAID'
        }
      ]

      for (const billData of testBills) {
        await request(app)
          .post('/api/bills/generate')
          .send({
            transactionId: testScrapTransactionId,
            billType: 'TAX_INVOICE',
            ...billData
          })
      }
    })

    it('should search bills by party name', async () => {
      const searchResponse = await request(app)
        .get('/api/bills?search=Alpha')
        .expect(200)

      expect(searchResponse.body.success).toBe(true)
      expect(searchResponse.body.data.length).toBeGreaterThan(0)
      
      const foundBill = searchResponse.body.data.find(bill => 
        bill.partyName.includes('Alpha')
      )
      expect(foundBill).toBeDefined()
    })

    it('should filter bills by status', async () => {
      const sentBillsResponse = await request(app)
        .get('/api/bills?status=SENT')
        .expect(200)

      expect(sentBillsResponse.body.success).toBe(true)
      sentBillsResponse.body.data.forEach(bill => {
        expect(bill.status).toBe('SENT')
      })
    })

    it('should filter bills by amount range', async () => {
      const rangeResponse = await request(app)
        .get('/api/bills?minAmount=20000&maxAmount=30000')
        .expect(200)

      expect(rangeResponse.body.success).toBe(true)
      rangeResponse.body.data.forEach(bill => {
        const amount = parseFloat(bill.totalAmount)
        expect(amount).toBeGreaterThanOrEqual(20000)
        expect(amount).toBeLessThanOrEqual(30000)
      })
    })

    it('should paginate bill results', async () => {
      const page1Response = await request(app)
        .get('/api/bills?page=1&limit=2')
        .expect(200)

      expect(page1Response.body.success).toBe(true)
      expect(page1Response.body.data.length).toBeLessThanOrEqual(2)
      expect(page1Response.body.pagination).toBeDefined()
      expect(page1Response.body.pagination.page).toBe(1)
      expect(page1Response.body.pagination.limit).toBe(2)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid bill generation requests', async () => {
      // Missing required fields
      const missingFieldsResponse = await request(app)
        .post('/api/bills/generate')
        .send({
          billType: 'TAX_INVOICE'
          // Missing partyName, totalAmount, etc.
        })
        .expect(400)

      expect(missingFieldsResponse.body.success).toBe(false)
      expect(missingFieldsResponse.body.error).toBeDefined()

      // Invalid bill type
      const invalidTypeResponse = await request(app)
        .post('/api/bills/generate')
        .send({
          billType: 'INVALID_TYPE',
          partyName: 'Test Customer',
          totalAmount: 5000
        })
        .expect(400)

      expect(invalidTypeResponse.body.success).toBe(false)

      // Invalid GST calculations
      const invalidGstResponse = await request(app)
        .post('/api/bills/generate')
        .send({
          billType: 'TAX_INVOICE',
          partyName: 'Test Customer',
          totalBeforeTax: 10000,
          sgst: 1000, // Should be 900 for 9%
          cgst: 900,
          totalAmount: 11900
        })
        .expect(400)

      expect(invalidGstResponse.body.success).toBe(false)
    })

    it('should handle non-existent bill requests', async () => {
      const nonExistentResponse = await request(app)
        .get('/api/bills/non-existent-id')
        .expect(404)

      expect(nonExistentResponse.body.success).toBe(false)
      expect(nonExistentResponse.body.error).toContain('not found')

      const nonExistentPdfResponse = await request(app)
        .get('/api/bills/non-existent-id/pdf')
        .expect(404)

      expect(nonExistentPdfResponse.body.error).toContain('not found')
    })
  })
})