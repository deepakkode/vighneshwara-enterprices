import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material'
import {
  Add,
  Recycling,
  TrendingUp,
  TrendingDown,
  Visibility,
  ShoppingCart,
  Sell
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Bar } from 'react-chartjs-2'
import { useApi } from '../context/ApiContext'
import { useScrapTransactions, useScrapAnalytics } from '../hooks/useApi'

const StyledCard = styled(Card)(() => ({
  background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.2)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0px 8px 25px rgba(0,0,0,0.15)'
  }
}))

// Predefined scrap types as per Firebase schema
const SCRAP_TYPES = [
  'IRON',
  'STEEL', 
  'ALUMINUM',
  'COPPER',
  'OTHER'
]

// Units for scrap transactions
const UNITS = [
  'KG',
  'TON',
  'PIECE'
]

// Validation schema for scrap transactions
const scrapTransactionSchema = yup.object({
  scrapType: yup.string().oneOf(SCRAP_TYPES).required('Scrap type is required'),
  transactionType: yup.string().oneOf(['PURCHASE', 'SALE']).required('Transaction type is required'),
  quantity: yup.number().positive('Quantity must be positive').required('Quantity is required'),
  unit: yup.string().oneOf(UNITS).required('Unit is required'),
  ratePerUnit: yup.number().positive('Rate must be positive').required('Rate per unit is required'),
  supplierName: yup.string().when('transactionType', {
    is: 'PURCHASE',
    then: (schema) => schema.required('Supplier name is required'),
    otherwise: (schema) => schema.notRequired()
  }),
  buyerName: yup.string().when('transactionType', {
    is: 'SALE',
    then: (schema) => schema.required('Buyer name is required'),
    otherwise: (schema) => schema.notRequired()
  }),
  description: yup.string().required('Description is required'),
  transactionDate: yup.date().required('Date is required')
})

const ScrapManagement = () => {
  const { emit } = useApi()
  const { transactions, loading: transactionsLoading, addTransaction, updateTransaction, deleteTransaction } = useScrapTransactions()
  const { analytics, loading: analyticsLoading } = useScrapAnalytics(7)
  const [loading, setLoading] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: yupResolver(scrapTransactionSchema),
    defaultValues: {
      scrapType: '',
      transactionType: 'PURCHASE',
      quantity: '',
      unit: 'KG',
      ratePerUnit: '',
      supplierName: '',
      buyerName: '',
      description: '',
      transactionDate: new Date().toISOString().split('T')[0]
    }
  })

  // Watch fields for automatic total calculation
  const quantity = watch('quantity')
  const ratePerUnit = watch('ratePerUnit')
  const transactionType = watch('transactionType')
  const totalAmount = quantity && ratePerUnit ? (parseFloat(quantity) * parseFloat(ratePerUnit)).toFixed(2) : '0.00'

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      // Calculate total amount
      const totalAmount = parseFloat(data.quantity) * parseFloat(data.ratePerUnit)
      
      // Add transaction using Firebase
      const result = await addTransaction({
        ...data,
        totalAmount,
        clientTimestamp: Date.now()
      })

      console.log('✅ Scrap transaction created successfully:', result)
      
      setSnackbar({
        open: true,
        message: `Scrap ${data.transactionType.toLowerCase()} added successfully!`,
        severity: 'success'
      })
      
      // Reset form
      reset({
        scrapType: '',
        transactionType: 'PURCHASE',
        quantity: '',
        unit: 'KG',
        ratePerUnit: '',
        supplierName: '',
        buyerName: '',
        description: '',
        transactionDate: new Date().toISOString().split('T')[0]
      })
      
      // Emit socket event for real-time updates (compatibility)
      emit('transaction-created', {
        type: 'scrap',
        transaction: result
      })
      
    } catch (error) {
      console.error('Scrap transaction submission error:', error)
      setSnackbar({
        open: true,
        message: 'Error adding transaction: ' + error.message,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  // Calculate summary statistics using Firebase analytics
  const calculateSummary = () => {
    if (!analytics) {
      return {
        totalPurchases: 0,
        totalSales: 0,
        profit: 0,
        purchaseCount: 0,
        saleCount: 0,
        totalTransactions: 0
      }
    }
    
    return {
      totalPurchases: analytics.totalPurchases,
      totalSales: analytics.totalSales,
      profit: analytics.profit,
      purchaseCount: analytics.purchaseCount,
      saleCount: analytics.saleCount,
      totalTransactions: transactions.length
    }
  }

  const summary = calculateSummary()

  // Prepare chart data for scrap type analysis
  const getScrapTypeData = () => {
    const scrapTypeStats = SCRAP_TYPES.map(type => {
      const typeTransactions = transactions.filter(t => t.scrapType === type)
      const purchases = typeTransactions.filter(t => t.transactionType === 'PURCHASE')
      const sales = typeTransactions.filter(t => t.transactionType === 'SALE')
      
      const purchaseAmount = purchases.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0)
      const saleAmount = sales.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0)
      
      return {
        type,
        purchases: purchaseAmount,
        sales: saleAmount,
        profit: saleAmount - purchaseAmount,
        quantity: typeTransactions.reduce((sum, t) => sum + parseFloat(t.quantity), 0)
      }
    }).filter(item => item.quantity > 0)

    return {
      labels: scrapTypeStats.map(item => item.type),
      datasets: [
        {
          label: 'Purchases',
          data: scrapTypeStats.map(item => item.purchases),
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        },
        {
          label: 'Sales',
          data: scrapTypeStats.map(item => item.sales),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    }
  }

  const chartData = getScrapTypeData()

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Scrap Type Analysis'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '₹' + value.toLocaleString()
          }
        }
      }
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Scrap Trading Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage scrap purchases and sales with automatic calculations
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <StyledCard>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Box sx={{ color: 'error.main' }}>
                    <ShoppingCart sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    Total Purchases
                  </Typography>
                </Stack>
                <Typography variant="h4" fontWeight="bold" color="error.main" gutterBottom>
                  {formatCurrency(summary.totalPurchases)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {summary.purchaseCount} transactions
                </Typography>
              </CardContent>
            </StyledCard>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <StyledCard>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Box sx={{ color: 'success.main' }}>
                    <Sell sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    Total Sales
                  </Typography>
                </Stack>
                <Typography variant="h4" fontWeight="bold" color="success.main" gutterBottom>
                  {formatCurrency(summary.totalSales)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {summary.saleCount} transactions
                </Typography>
              </CardContent>
            </StyledCard>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <StyledCard>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Box sx={{ color: summary.profit >= 0 ? 'success.main' : 'error.main' }}>
                    {summary.profit >= 0 ? 
                      <TrendingUp sx={{ fontSize: 32 }} /> : 
                      <TrendingDown sx={{ fontSize: 32 }} />
                    }
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    Net Profit
                  </Typography>
                </Stack>
                <Typography 
                  variant="h4" 
                  fontWeight="bold" 
                  color={summary.profit >= 0 ? 'success.main' : 'error.main'} 
                  gutterBottom
                >
                  {formatCurrency(summary.profit)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {summary.totalTransactions} total transactions
                </Typography>
              </CardContent>
            </StyledCard>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <StyledCard>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Box sx={{ color: 'primary.main' }}>
                    <Recycling sx={{ fontSize: 32 }} />
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    Active Types
                  </Typography>
                </Stack>
                <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
                  {new Set(transactions.map(t => t.scrapType)).size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {SCRAP_TYPES.length} available
                </Typography>
              </CardContent>
            </StyledCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* Transaction Form */}
      <StyledCard sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Add New Scrap Transaction
          </Typography>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Controller
                  name="scrapType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.scrapType}>
                      <InputLabel>Scrap Type</InputLabel>
                      <Select {...field} label="Scrap Type">
                        {SCRAP_TYPES.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.scrapType && (
                        <Typography variant="caption" color="error">
                          {errors.scrapType.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Controller
                  name="transactionType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select {...field} label="Type">
                        <MenuItem value="PURCHASE">Purchase</MenuItem>
                        <MenuItem value="SALE">Sale</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Controller
                  name="quantity"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Quantity (kg)"
                      type="number"
                      error={!!errors.quantity}
                      helperText={errors.quantity?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Controller
                  name="ratePerUnit"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Rate (₹/kg)"
                      type="number"
                      error={!!errors.ratePerUnit}
                      helperText={errors.ratePerUnit?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Total Amount"
                  value={`₹${totalAmount}`}
                  disabled
                  sx={{ 
                    '& .MuiInputBase-input': { 
                      fontWeight: 'bold',
                      color: 'success.main'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={1}>
                <Controller
                  name="transactionDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.transactionDate}
                      helperText={errors.transactionDate?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name={transactionType === 'PURCHASE' ? 'supplierName' : 'buyerName'}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={transactionType === 'PURCHASE' ? 'Supplier Name' : 'Buyer Name'}
                      error={!!errors[transactionType === 'PURCHASE' ? 'supplierName' : 'buyerName']}
                      helperText={errors[transactionType === 'PURCHASE' ? 'supplierName' : 'buyerName']?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  startIcon={<Add />}
                >
                  {loading ? 'Adding...' : 'Add Transaction'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </StyledCard>

      {/* Analytics and Transaction History */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Scrap Type Analysis
              </Typography>
              <Box sx={{ height: 300, position: 'relative' }}>
                {chartData.labels.length > 0 ? (
                  <Bar data={chartData} options={chartOptions} />
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography color="text.secondary">
                      No data available for chart
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Top Performing Scrap Types
              </Typography>
              <Stack spacing={2}>
                {SCRAP_TYPES.map(type => {
                  const typeTransactions = transactions.filter(t => t.scrapType === type)
                  if (typeTransactions.length === 0) return null
                  
                  const purchases = typeTransactions.filter(t => t.transactionType === 'PURCHASE')
                  const sales = typeTransactions.filter(t => t.transactionType === 'SALE')
                  
                  const purchaseAmount = purchases.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0)
                  const saleAmount = sales.reduce((sum, t) => sum + parseFloat(t.totalAmount), 0)
                  const profit = saleAmount - purchaseAmount
                  
                  return (
                    <Box key={type} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {type}
                      </Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Profit: {formatCurrency(profit)}
                        </Typography>
                        <Chip 
                          label={`${typeTransactions.length} txns`}
                          size="small"
                          color={profit > 0 ? 'success' : profit < 0 ? 'error' : 'default'}
                        />
                      </Stack>
                    </Box>
                  )
                }).filter(Boolean).slice(0, 5)}
                
                {transactions.length === 0 && (
                  <Alert severity="info">
                    No scrap type data available yet.
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Transactions
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Scrap</TableCell>
                      <TableCell>Supplier/Buyer</TableCell>
                      <TableCell align="right">Qty (kg)</TableCell>
                      <TableCell align="right">Rate (₹/kg)</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions
                      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
                      .map((transaction) => (
                        <TableRow key={transaction.id} hover>
                          <TableCell>
                            {new Date(transaction.transactionDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={transaction.transactionType}
                              color={transaction.transactionType === 'SALE' ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{transaction.scrapType}</TableCell>
                          <TableCell>{transaction.supplierName || transaction.buyerName}</TableCell>
                          <TableCell align="right">{transaction.quantity}</TableCell>
                          <TableCell align="right">₹{transaction.ratePerUnit}</TableCell>
                          <TableCell 
                            align="right"
                            sx={{ 
                              color: transaction.transactionType === 'SALE' ? 'success.main' : 'error.main',
                              fontWeight: 'bold'
                            }}
                          >
                            {formatCurrency(transaction.totalAmount)}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setSelectedTransaction(transaction)
                                setOpenDialog(true)
                              }}
                            >
                              <Visibility />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {transactions.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No scrap transactions found. Add your first transaction above.
                </Alert>
              )}
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>

      {/* Transaction Details Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Transaction Details
        </DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Scrap Type
                </Typography>
                <Typography variant="h6">
                  {selectedTransaction.scrapType}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Transaction Type
                </Typography>
                <Chip 
                  label={selectedTransaction.transactionType}
                  color={selectedTransaction.transactionType === 'SALE' ? 'success' : 'error'}
                />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Quantity
                </Typography>
                <Typography variant="h6">
                  {selectedTransaction.quantity} kg
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Rate per kg
                </Typography>
                <Typography variant="h6">
                  ₹{selectedTransaction.ratePerUnit}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Amount
                </Typography>
                <Typography 
                  variant="h5" 
                  fontWeight="bold"
                  color={selectedTransaction.transactionType === 'SALE' ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(selectedTransaction.totalAmount)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {selectedTransaction.transactionType === 'PURCHASE' ? 'Supplier' : 'Buyer'}
                </Typography>
                <Typography variant="h6">
                  {selectedTransaction.supplierName || selectedTransaction.buyerName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Date
                </Typography>
                <Typography variant="h6">
                  {new Date(selectedTransaction.transactionDate).toLocaleDateString()}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ScrapManagement