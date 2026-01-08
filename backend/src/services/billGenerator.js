import puppeteer from 'puppeteer'

class BillGenerator {
  constructor() {
    this.browser = null
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }
    return this.browser
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  // Generate Purchase Voucher
  async generatePurchaseVoucher(data) {
    const browser = await this.initBrowser()
    const page = await browser.newPage()
    
    try {
      const html = this.getPurchaseVoucherTemplate(data)
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      })
      
      return pdf
    } finally {
      await page.close()
    }
  }

  // Generate Tax Invoice
  async generateTaxInvoice(data) {
    const browser = await this.initBrowser()
    const page = await browser.newPage()
    
    try {
      const html = this.getTaxInvoiceTemplate(data)
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      })
      
      return pdf
    } finally {
      await page.close()
    }
  }

  // Purchase Voucher Template
  getPurchaseVoucherTemplate(data) {
    const {
      billNumber,
      billDate,
      supplierName,
      supplierAddress,
      items,
      totalAmount,
      gstAmount,
      grandTotal
    } = data

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Voucher - ${billNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #E53E3E; padding-bottom: 20px; }
    .company-name { font-size: 28px; font-weight: bold; color: #E53E3E; margin-bottom: 5px; }
    .bill-title { font-size: 20px; font-weight: bold; margin-top: 15px; }
    .bill-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .bill-details, .supplier-details { width: 48%; }
    .section-title { font-weight: bold; color: #E53E3E; margin-bottom: 10px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    .items-table th { background-color: #E53E3E; color: white; }
    .amount-column { text-align: right; }
    .totals { float: right; width: 300px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .grand-total { font-weight: bold; font-size: 16px; color: #E53E3E; border-top: 2px solid #E53E3E; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">VIGHNESHWARA ENTERPRISES</div>
    <div class="bill-title">PURCHASE VOUCHER</div>
  </div>
  <div class="bill-info">
    <div class="bill-details">
      <div class="section-title">Bill Details</div>
      <div>Bill No: ${billNumber}</div>
      <div>Date: ${new Date(billDate).toLocaleDateString('en-IN')}</div>
    </div>
    <div class="supplier-details">
      <div class="section-title">Supplier Details</div>
      <div>Name: ${supplierName}</div>
      <div>Address: ${supplierAddress || 'N/A'}</div>
    </div>
  </div>
  <table class="items-table">
    <thead>
      <tr><th>S.No</th><th>Description</th><th>Quantity</th><th>Rate</th><th class="amount-column">Amount</th></tr>
    </thead>
    <tbody>
      ${items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.description}</td>
          <td>${item.quantity} ${item.unit || 'kg'}</td>
          <td>₹${parseFloat(item.rate).toFixed(2)}</td>
          <td class="amount-column">₹${parseFloat(item.amount).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Subtotal:</span><span>₹${parseFloat(totalAmount).toFixed(2)}</span></div>
    ${gstAmount ? `<div class="total-row"><span>GST (18%):</span><span>₹${parseFloat(gstAmount).toFixed(2)}</span></div>` : ''}
    <div class="total-row grand-total"><span>Grand Total:</span><span>₹${parseFloat(grandTotal).toFixed(2)}</span></div>
  </div>
</body>
</html>`
  }

  // Tax Invoice Template
  getTaxInvoiceTemplate(data) {
    const {
      billNumber,
      billDate,
      customerName,
      customerAddress,
      customerGST,
      items,
      totalAmount,
      gstAmount,
      grandTotal,
      companyGST = '29ABCDE1234F1Z5'
    } = data

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${billNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #38A169; padding-bottom: 20px; }
    .company-name { font-size: 28px; font-weight: bold; color: #38A169; margin-bottom: 5px; }
    .bill-title { font-size: 20px; font-weight: bold; margin-top: 15px; }
    .bill-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .bill-details, .customer-details { width: 48%; }
    .section-title { font-weight: bold; color: #38A169; margin-bottom: 10px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .items-table th { background-color: #38A169; color: white; }
    .amount-column { text-align: right; }
    .totals { float: right; width: 350px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .grand-total { font-weight: bold; font-size: 16px; color: #38A169; border-top: 2px solid #38A169; padding-top: 10px; }
    .amount-in-words { margin-top: 20px; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #38A169; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">VIGHNESHWARA ENTERPRISES</div>
    <div>GST No: ${companyGST}</div>
    <div class="bill-title">TAX INVOICE</div>
  </div>
  <div class="bill-info">
    <div class="bill-details">
      <div class="section-title">Invoice Details</div>
      <div>Invoice No: ${billNumber}</div>
      <div>Date: ${new Date(billDate).toLocaleDateString('en-IN')}</div>
      <div>Place: Karnataka</div>
    </div>
    <div class="customer-details">
      <div class="section-title">Bill To</div>
      <div>Name: ${customerName}</div>
      <div>Address: ${customerAddress || 'N/A'}</div>
      ${customerGST ? `<div>GST No: ${customerGST}</div>` : ''}
    </div>
  </div>
  <table class="items-table">
    <thead>
      <tr><th>S.No</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Rate</th><th class="amount-column">Amount</th></tr>
    </thead>
    <tbody>
      ${items.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.description}</td>
          <td>${item.hsn || '9999'}</td>
          <td>${item.quantity} ${item.unit || 'kg'}</td>
          <td>₹${parseFloat(item.rate).toFixed(2)}</td>
          <td class="amount-column">₹${parseFloat(item.amount).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Taxable Amount:</span><span>₹${parseFloat(totalAmount).toFixed(2)}</span></div>
    ${gstAmount ? `
    <div class="total-row"><span>CGST (9%):</span><span>₹${(parseFloat(gstAmount) / 2).toFixed(2)}</span></div>
    <div class="total-row"><span>SGST (9%):</span><span>₹${(parseFloat(gstAmount) / 2).toFixed(2)}</span></div>
    ` : ''}
    <div class="total-row grand-total"><span>Total Amount:</span><span>₹${parseFloat(grandTotal).toFixed(2)}</span></div>
  </div>
  <div class="amount-in-words"><strong>Amount in Words:</strong> ${this.numberToWords(grandTotal)} Only</div>
</body>
</html>`
  }

  // Convert number to words (Indian format)
  numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    
    if (num === 0) return 'Zero'
    
    const crores = Math.floor(num / 10000000)
    const lakhs = Math.floor((num % 10000000) / 100000)
    const thousands = Math.floor((num % 100000) / 1000)
    const hundreds = Math.floor((num % 1000) / 100)
    const remainder = num % 100
    
    let result = ''
    
    if (crores > 0) {
      result += this.convertHundreds(crores) + ' Crore '
    }
    
    if (lakhs > 0) {
      result += this.convertHundreds(lakhs) + ' Lakh '
    }
    
    if (thousands > 0) {
      result += this.convertHundreds(thousands) + ' Thousand '
    }
    
    if (hundreds > 0) {
      result += ones[hundreds] + ' Hundred '
    }
    
    if (remainder > 0) {
      if (remainder < 10) {
        result += ones[remainder]
      } else if (remainder < 20) {
        result += teens[remainder - 10]
      } else {
        result += tens[Math.floor(remainder / 10)]
        if (remainder % 10 > 0) {
          result += ' ' + ones[remainder % 10]
        }
      }
    }
    
    return result.trim()
  }
  
  convertHundreds(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    
    let result = ''
    
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred '
      num %= 100
    }
    
    if (num >= 20) {
      result += tens[Math.floor(num / 10)]
      if (num % 10 > 0) {
        result += ' ' + ones[num % 10]
      }
    } else if (num >= 10) {
      result += teens[num - 10]
    } else if (num > 0) {
      result += ones[num]
    }
    
    return result.trim()
  }
}

export default BillGenerator