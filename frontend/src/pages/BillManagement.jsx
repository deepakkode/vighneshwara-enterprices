import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  IconButton,
  Fab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  Tabs,
  Tab,
  Skeleton,
  Tooltip
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  Description as InvoiceIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'
import { useApi } from '../context/ApiContext'
import { useBills } from '../hooks/useApi'
import toast from 'react-hot-toast'

const BillManagement = () => {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [selectedTab, setSelectedTab] = useState(0)
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'edit', 'view'
  const [selectedBill, setSelectedBill] = useState(null)
  
  // Form states
  const [formData, setFormData] = useState({
    type: 'PURCHASE_VOUCHER',
    billNumber: '',
    customerName: '',
    customerAddress: '',
    customerGST: '',
    supplierName: '',
    supplierAddress: '',
    items: [{ description: '', quantity: '', unit: 'kg', rate: '', hsn: '' }]
  })

  const { isOnline } = useApi()
  const { bills, loading, createBill, updateBill, deleteBill } = useBills()

  // Filter bills based on search and type
  const filteredBills = bills.filter(bill => {
    const matchesSearch = !searchTerm || 
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.customerName && bill.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bill.supplierName && bill.supplierName.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = !filterType || bill.type === filterType
    const matchesTab = selectedTab === 2 || 
      (selectedTab === 0 && bill.type === 'PURCHASE_VOUCHER') ||
      (selectedTab === 1 && bill.type === 'TAX_INVOICE')
    
    return matchesSearch && matchesType && matchesTab
  })

  // Paginate filtered bills
  const paginatedBills = filteredBills.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
  const totalBills = filteredBills.length

  const handleCreateBill = () => {
    setDialogMode('create')
    setFormData({
      type: 'PURCHASE_VOUCHER',
      billNumber: `${selectedTab === 0 ? 'PV' : 'TI'}-${Date.now()}`,
      customerName: '',
      customerAddress: '',
      customerGST: '',
      supplierName: '',
      supplierAddress: '',
      items: [{ description: '', quantity: '', unit: 'kg', rate: '', hsn: '' }]
    })
    setOpenDialog(true)
  }

  const handleEditBill = (bill) => {
    setDialogMode('edit')
    setSelectedBill(bill)
    setFormData({
      type: bill.type,
      billNumber: bill.billNumber,
      customerName: bill.customerName || '',
      customerAddress: bill.customerAddress || '',
      customerGST: bill.customerGST || '',
      supplierName: bill.supplierName || '',
      supplierAddress: bill.supplierAddress || '',
      items: bill.items.map(item => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unit: item.unit,
        rate: item.rate.toString(),
        hsn: item.hsn || ''
      }))
    })
    setOpenDialog(true)
  }

  const handleViewBill = (bill) => {
    setDialogMode('view')
    setSelectedBill(bill)
    setFormData({
      type: bill.type,
      billNumber: bill.billNumber,
      customerName: bill.customerName || '',
      customerAddress: bill.customerAddress || '',
      customerGST: bill.customerGST || '',
      supplierName: bill.supplierName || '',
      supplierAddress: bill.supplierAddress || '',
      items: bill.items
    })
    setOpenDialog(true)
  }

  const handleDeleteBill = async (billId) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return

    try {
      await deleteBill(billId)
      toast.success('Bill deleted successfully')
    } catch (error) {
      console.error('Error deleting bill:', error)
      toast.error('Failed to delete bill')
    }
  }

  const handleDownloadPDF = async (bill) => {
    try {
      // Generate PDF content using bill data
      const pdfContent = generateBillPDF(bill)
      
      // Create blob and download
      const blob = new Blob([pdfContent], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${bill.billNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF')
    }
  }

  const generateBillPDF = (bill) => {
    // Simple PDF generation - in a real app, use a proper PDF library like jsPDF
    const content = `
      Bill Number: ${bill.billNumber}
      Type: ${bill.type}
      Date: ${new Date(bill.billDate).toLocaleDateString('en-IN')}
      ${bill.customerName ? `Customer: ${bill.customerName}` : `Supplier: ${bill.supplierName}`}
      
      Items:
      ${bill.items.map(item => `${item.description} - ${item.quantity} ${item.unit} @ ₹${item.rate}`).join('\n')}
      
      Total: ₹${bill.grandTotal.toFixed(2)}
    `
    return content
  }

  const handleSubmit = async () => {
    if (!isOnline) {
      toast.error('Cannot save bills while offline')
      return
    }

    try {
      // Validate form
      if (!formData.billNumber || formData.items.some(item => !item.description || !item.quantity || !item.rate)) {
        toast.error('Please fill all required fields')
        return
      }

      const submitData = {
        ...formData,
        billDate: new Date().toISOString(),
        items: formData.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          amount: parseFloat(item.quantity) * parseFloat(item.rate)
        })),
        subtotal: total,
        gst: gst,
        grandTotal: grandTotal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (dialogMode === 'edit') {
        await updateBill(selectedBill.id, submitData)
        toast.success('Bill updated successfully')
      } else {
        await createBill(submitData)
        toast.success('Bill created successfully')
      }
      
      setOpenDialog(false)
    } catch (error) {
      console.error(`Error ${dialogMode}ing bill:`, error)
      toast.error(`Failed to ${dialogMode} bill`)
    }
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: '', unit: 'kg', rate: '', hsn: '' }]
    }))
  }

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const calculateTotal = () => {
    const total = formData.items.reduce((sum, item) => {
      const amount = parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)
    const gst = total * 0.18
    return { total, gst, grandTotal: total + gst }
  }

  const { total, gst, grandTotal } = calculateTotal()

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Bill Management
        </Typography>
        <Fab
          color="primary"
          aria-label="add bill"
          onClick={handleCreateBill}
          sx={{ 
            background: 'linear-gradient(135deg, #E53E3E 0%, #3182CE 50%, #38A169 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #C53030 0%, #2C5282 50%, #2F855A 100%)'
            }
          }}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Filter by Type</InputLabel>
              <Select
                value={filterType}
                label="Filter by Type"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="PURCHASE_VOUCHER">Purchase Voucher</MenuItem>
                <MenuItem value="TAX_INVOICE">Tax Invoice</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              fontSize: '1rem'
            }
          }}
        >
          <Tab 
            icon={<ReceiptIcon />} 
            label="Purchase Vouchers" 
            iconPosition="start"
          />
          <Tab 
            icon={<InvoiceIcon />} 
            label="Tax Invoices" 
            iconPosition="start"
          />
          <Tab 
            icon={<FilterIcon />} 
            label="All Bills" 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Bills Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Bill Number</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Customer/Supplier</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: rowsPerPage }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                  </TableRow>
                ))
              ) : paginatedBills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body1" color="textSecondary">
                      No bills found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBills.map((bill) => (
                  <TableRow key={bill.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {bill.billNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={bill.type === 'PURCHASE_VOUCHER' ? 'Purchase' : 'Tax Invoice'}
                        color={bill.type === 'PURCHASE_VOUCHER' ? 'primary' : 'secondary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(bill.billDate).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {bill.customerName || bill.supplierName || 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        ₹{bill.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          onClick={() => handleViewBill(bill)}
                          color="info"
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditBill(bill)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download PDF">
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadPDF(bill)}
                          color="success"
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteBill(bill.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalBills}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
        />
      </Paper>

      {/* Bill Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New Bill' : 
           dialogMode === 'edit' ? 'Edit Bill' : 'View Bill'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Bill Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={dialogMode === 'view'}>
                <InputLabel>Bill Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Bill Type"
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="PURCHASE_VOUCHER">Purchase Voucher</MenuItem>
                  <MenuItem value="TAX_INVOICE">Tax Invoice</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Bill Number */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bill Number"
                value={formData.billNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, billNumber: e.target.value }))}
                disabled={dialogMode === 'view'}
                required
              />
            </Grid>

            {/* Customer/Supplier Details */}
            {formData.type === 'TAX_INVOICE' ? (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Customer Name"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    disabled={dialogMode === 'view'}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Customer GST"
                    value={formData.customerGST}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerGST: e.target.value }))}
                    disabled={dialogMode === 'view'}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Customer Address"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                    disabled={dialogMode === 'view'}
                    multiline
                    rows={2}
                  />
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Supplier Name"
                    value={formData.supplierName}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
                    disabled={dialogMode === 'view'}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Supplier Address"
                    value={formData.supplierAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierAddress: e.target.value }))}
                    disabled={dialogMode === 'view'}
                    multiline
                    rows={2}
                  />
                </Grid>
              </>
            )}

            {/* Items */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Items</Typography>
              {formData.items.map((item, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      disabled={dialogMode === 'view'}
                      required
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="Quantity"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      disabled={dialogMode === 'view'}
                      required
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <FormControl fullWidth disabled={dialogMode === 'view'}>
                      <InputLabel>Unit</InputLabel>
                      <Select
                        value={item.unit}
                        label="Unit"
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      >
                        <MenuItem value="kg">kg</MenuItem>
                        <MenuItem value="ton">ton</MenuItem>
                        <MenuItem value="piece">piece</MenuItem>
                        <MenuItem value="liter">liter</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <TextField
                      fullWidth
                      label="Rate"
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', e.target.value)}
                      disabled={dialogMode === 'view'}
                      required
                    />
                  </Grid>
                  <Grid item xs={6} md={1}>
                    <TextField
                      fullWidth
                      label="HSN"
                      value={item.hsn}
                      onChange={(e) => updateItem(index, 'hsn', e.target.value)}
                      disabled={dialogMode === 'view'}
                    />
                  </Grid>
                  <Grid item xs={12} md={1}>
                    {dialogMode !== 'view' && formData.items.length > 1 && (
                      <IconButton
                        color="error"
                        onClick={() => removeItem(index)}
                        sx={{ mt: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              ))}
              
              {dialogMode !== 'view' && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={addItem}
                  variant="outlined"
                  sx={{ mt: 1 }}
                >
                  Add Item
                </Button>
              )}
            </Grid>

            {/* Totals */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      Subtotal: ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2">
                      GST (18%): ₹{gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="h6" color="primary">
                      Total: ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Cancel
          </Button>
          {dialogMode !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #E53E3E 0%, #3182CE 50%, #38A169 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #C53030 0%, #2C5282 50%, #2F855A 100%)'
                }
              }}
            >
              {dialogMode === 'edit' ? 'Update' : 'Create'} Bill
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default BillManagement