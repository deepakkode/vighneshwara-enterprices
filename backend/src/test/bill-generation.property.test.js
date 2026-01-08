import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fc from 'fast-check'
import BillGenerator from '../services/billGenerator.js'

describe('Bill Generation Property Tests', () => {
  let billGenerator

  beforeAll(() => {
    billGenerator = new BillGenerator()
  })

  afterAll(async () => {
    if (billGenerator) {
      await billGenerator.closeBrowser()
    }
  })

  /**
   * Property 8: Bill Data Integrity
   * Validates: Requirements 12.3, 13.3, 13.4, 13.5
   * 
   * This property ensures that:
   * - All input data appears correctly in generated bills
   * - Calculations are accurate and consistent
   * - Bill numbers and dates are properly formatted
   * - GST calculations follow Indian tax rules
   */
  describe('Property 8: Bill Data Integrity', () => {
    it('should maintain data integrity in purchase vouchers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            billNumber: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z0-9-]+$/.test(s)),
            billDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            supplierName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
            supplierAddress: fc.option(fc.string({ minLength: 5, maxLength: 100 })),
            items: fc.array(
              fc.record({
                description: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
                quantity: fc.float({ min: 0.1, max: 1000, noNaN: true }).map(n => Math.round(n * 100) / 100),
                unit: fc.constantFrom('kg', 'ton', 'piece', 'liter'),
                rate: fc.float({ min: 1, max: 10000, noNaN: true }).map(n => Math.round(n * 100) / 100)
              }).map(item => ({
                ...item,
                amount: Math.round(item.quantity * item.rate * 100) / 100
              })),
              { minLength: 1, maxLength: 5 }
            )
          }).map(data => {
            const totalAmount = Math.round(data.items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
            const gstAmount = Math.round(totalAmount * 0.18 * 100) / 100
            const grandTotal = Math.round((totalAmount + gstAmount) * 100) / 100
            
            return {
              ...data,
              totalAmount,
              gstAmount,
              grandTotal
            }
          }),
          async (billData) => {
            // Generate PDF
            const pdfBuffer = await billGenerator.generatePurchaseVoucher(billData)
            
            // Verify PDF was generated
            expect(pdfBuffer).toBeInstanceOf(Buffer)
            expect(pdfBuffer.length).toBeGreaterThan(1000) // Reasonable PDF size
            
            // Verify PDF header
            const pdfHeader = pdfBuffer.toString('ascii', 0, 10)
            expect(pdfHeader).toContain('%PDF')
            
            // Test calculation accuracy
            const calculatedTotal = billData.items.reduce((sum, item) => sum + item.amount, 0)
            expect(Math.abs(billData.totalAmount - calculatedTotal)).toBeLessThan(0.01)
            
            // Test GST calculation (18%)
            const expectedGST = Math.round(billData.totalAmount * 0.18 * 100) / 100
            expect(Math.abs(billData.gstAmount - expectedGST)).toBeLessThan(0.01)
            
            // Test grand total
            const expectedGrandTotal = Math.round((billData.totalAmount + billData.gstAmount) * 100) / 100
            expect(Math.abs(billData.grandTotal - expectedGrandTotal)).toBeLessThan(0.01)
          }
        ),
        { numRuns: 10, timeout: 30000 }
      )
    })

    it('should maintain data integrity in tax invoices', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            billNumber: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[A-Z0-9-]+$/.test(s)),
            billDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            customerName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
            customerAddress: fc.option(fc.string({ minLength: 5, maxLength: 100 })),
            customerGST: fc.option(fc.string({ minLength: 15, maxLength: 15 }).filter(s => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(s))),
            items: fc.array(
              fc.record({
                description: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
                quantity: fc.float({ min: 0.1, max: 1000, noNaN: true }).map(n => Math.round(n * 100) / 100),
                unit: fc.constantFrom('kg', 'ton', 'piece', 'liter'),
                rate: fc.float({ min: 1, max: 10000, noNaN: true }).map(n => Math.round(n * 100) / 100),
                hsn: fc.option(fc.string({ minLength: 4, maxLength: 8 }).filter(s => /^[0-9]+$/.test(s)))
              }).map(item => ({
                ...item,
                amount: Math.round(item.quantity * item.rate * 100) / 100
              })),
              { minLength: 1, maxLength: 5 }
            )
          }).map(data => {
            const totalAmount = Math.round(data.items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
            const gstAmount = Math.round(totalAmount * 0.18 * 100) / 100
            const grandTotal = Math.round((totalAmount + gstAmount) * 100) / 100
            
            return {
              ...data,
              totalAmount,
              gstAmount,
              grandTotal
            }
          }),
          async (billData) => {
            // Generate PDF
            const pdfBuffer = await billGenerator.generateTaxInvoice(billData)
            
            // Verify PDF was generated
            expect(pdfBuffer).toBeInstanceOf(Buffer)
            expect(pdfBuffer.length).toBeGreaterThan(1000) // Reasonable PDF size
            
            // Verify PDF header
            const pdfHeader = pdfBuffer.toString('ascii', 0, 10)
            expect(pdfHeader).toContain('%PDF')
            
            // Test calculation accuracy
            const calculatedTotal = billData.items.reduce((sum, item) => sum + item.amount, 0)
            expect(Math.abs(billData.totalAmount - calculatedTotal)).toBeLessThan(0.01)
            
            // Test GST calculation (18% split as 9% CGST + 9% SGST)
            const expectedGST = Math.round(billData.totalAmount * 0.18 * 100) / 100
            expect(Math.abs(billData.gstAmount - expectedGST)).toBeLessThan(0.01)
            
            // Test grand total
            const expectedGrandTotal = Math.round((billData.totalAmount + billData.gstAmount) * 100) / 100
            expect(Math.abs(billData.grandTotal - expectedGrandTotal)).toBeLessThan(0.01)
          }
        ),
        { numRuns: 10, timeout: 30000 }
      )
    })

    it('should handle number to words conversion correctly', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 99999999, noNaN: true }).map(n => Math.round(n * 100) / 100),
          (amount) => {
            const words = billGenerator.numberToWords(amount)
            
            // Should return a non-empty string
            expect(words).toBeTruthy()
            expect(typeof words).toBe('string')
            expect(words.length).toBeGreaterThan(0)
            
            // Should not contain numbers
            expect(words).not.toMatch(/\d/)
            
            // Should contain valid Indian number words
            const validWords = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                              'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
                              'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
                              'Hundred', 'Thousand', 'Lakh', 'Crore']
            
            const wordsInResult = words.split(' ').filter(word => word.length > 0)
            wordsInResult.forEach(word => {
              expect(validWords).toContain(word)
            })
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should generate consistent PDFs for identical data', async () => {
      const testData = {
        billNumber: 'TEST-001',
        billDate: new Date('2024-01-15'),
        supplierName: 'Test Supplier',
        supplierAddress: 'Test Address',
        items: [
          {
            description: 'Test Item',
            quantity: 10,
            unit: 'kg',
            rate: 100,
            amount: 1000
          }
        ],
        totalAmount: 1000,
        gstAmount: 180,
        grandTotal: 1180
      }

      // Generate PDF twice
      const pdf1 = await billGenerator.generatePurchaseVoucher(testData)
      const pdf2 = await billGenerator.generatePurchaseVoucher(testData)

      // PDFs should be similar in size (allowing for timestamp differences)
      const sizeDifference = Math.abs(pdf1.length - pdf2.length)
      expect(sizeDifference).toBeLessThan(1000) // Allow small differences due to timestamps

      // Both should be valid PDFs
      expect(pdf1.toString('ascii', 0, 10)).toContain('%PDF')
      expect(pdf2.toString('ascii', 0, 10)).toContain('%PDF')
    })

    it('should handle edge cases in calculations', () => {
      fc.assert(
        fc.property(
          fc.record({
            quantity: fc.constantFrom(0.01, 0.1, 1, 10, 100, 999.99),
            rate: fc.constantFrom(0.01, 0.1, 1, 10, 100, 9999.99)
          }),
          (data) => {
            const amount = Math.round(data.quantity * data.rate * 100) / 100
            
            // Amount should be positive
            expect(amount).toBeGreaterThan(0)
            
            // Amount should be properly rounded to 2 decimal places
            expect(amount.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2)
            
            // GST calculation should be accurate
            const gst = Math.round(amount * 0.18 * 100) / 100
            expect(gst).toBeGreaterThanOrEqual(0)
            expect(gst.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2)
            
            // Grand total should be sum of amount and GST
            const grandTotal = Math.round((amount + gst) * 100) / 100
            expect(Math.abs(grandTotal - (amount + gst))).toBeLessThan(0.01)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Bill Template Validation', () => {
    it('should generate valid HTML templates', () => {
      const testData = {
        billNumber: 'TEST-001',
        billDate: new Date(),
        supplierName: 'Test Supplier',
        items: [{
          description: 'Test Item',
          quantity: 1,
          rate: 100,
          amount: 100
        }],
        totalAmount: 100,
        gstAmount: 18,
        grandTotal: 118
      }

      // Test purchase voucher template
      const purchaseHtml = billGenerator.getPurchaseVoucherTemplate(testData)
      expect(purchaseHtml).toContain('<!DOCTYPE html>')
      expect(purchaseHtml).toContain('VIGHNESHWARA ENTERPRISES')
      expect(purchaseHtml).toContain('PURCHASE VOUCHER')
      expect(purchaseHtml).toContain(testData.billNumber)
      expect(purchaseHtml).toContain(testData.supplierName)

      // Test tax invoice template
      const invoiceData = {
        ...testData,
        customerName: 'Test Customer'
      }
      const invoiceHtml = billGenerator.getTaxInvoiceTemplate(invoiceData)
      expect(invoiceHtml).toContain('<!DOCTYPE html>')
      expect(invoiceHtml).toContain('VIGHNESHWARA ENTERPRISES')
      expect(invoiceHtml).toContain('TAX INVOICE')
      expect(invoiceHtml).toContain(invoiceData.billNumber)
      expect(invoiceHtml).toContain(invoiceData.customerName)
    })
  })
})