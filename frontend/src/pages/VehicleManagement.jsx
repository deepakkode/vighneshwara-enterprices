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
  Tabs,
  Tab,
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
  DirectionsCar,
  LocalShipping,
  Visibility,
  Assessment
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Line } from 'react-chartjs-2'
import { useApi } from '../context/ApiContext'
import { useVehicles, useVehicleTransactions, useVehicleAnalytics } from '../hooks/useApi'

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

// Validation schema for vehicle transactions
const vehicleTransactionSchema = yup.object({
  vehicleId: yup.string().required('Vehicle is required'),
  transactionType: yup.string().oneOf(['INCOME', 'EXPENSE']).required('Transaction type is required'),
  amount: yup.number().positive('Amount must be positive').required('Amount is required'),
  description: yup.string().required('Description is required'),
  transactionDate: yup.date().required('Date is required'),
  incomeType: yup.string().when('transactionType', {
    is: 'INCOME',
    then: (schema) => schema.oneOf(['RENTAL', 'TRANSPORTATION']).required('Income type is required'),
    otherwise: (schema) => schema.notRequired()
  }),
  expenseType: yup.string().when('transactionType', {
    is: 'EXPENSE', 
    then: (schema) => schema.oneOf(['PETROL', 'MAINTENANCE', 'REPAIRS', 'OTHER']).required('Expense type is required'),
    otherwise: (schema) => schema.notRequired()
  })
})

const VehicleManagement = () => {
  const { emit } = useApi()
  const { vehicles, loading: vehiclesLoading, addVehicle, updateVehicle, deleteVehicle } = useVehicles()
  const { transactions, loading: transactionsLoading, addTransaction, updateTransaction, deleteTransaction } = useVehicleTransactions()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0)
  const [pendingFormData, setPendingFormData] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(false)

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: yupResolver(vehicleTransactionSchema),
    defaultValues: {
      vehicleId: '',
      transactionType: 'INCOME',
      amount: '',
      description: '',
      transactionDate: new Date().toISOString().split('T')[0],
      incomeType: 'RENTAL',
      expenseType: 'PETROL'
    }
  })

  const watchTransactionType = watch('transactionType')

  // Refresh data when tab changes
  useEffect(() => {
    console.log('🔄 Active tab changed to:', activeTab)
  }, [activeTab])

  const onSubmit = async (data) => {
    // Show confirmation dialog first
    setPendingFormData(data)
    setConfirmDialog(true)
  }

  const handleConfirmSubmit = async () => {
    const data = pendingFormData
    const now = Date.now()
    
    // Close confirmation dialog
    setConfirmDialog(false)
    setPendingFormData(null)
    
    // Prevent multiple submissions within 3 seconds
    if (loading || (now - lastSubmissionTime < 3000)) {
      console.log('Preventing duplicate submission')
      return
    }
    
    setLastSubmissionTime(now)
    setLoading(true)
    
    try {
      // Add transaction using Firebase
      const result = await addTransaction({
        ...data,
        clientTimestamp: now
      })
      
      console.log('✅ Transaction created successfully:', result)
      
      // Find the vehicle to determine which tab to show
      const vehicle = vehicles.find(v => v.id === data.vehicleId)
      const vehicleType = vehicle?.vehicleType
      
      setSnackbar({
        open: true,
        message: `Transaction added successfully to ${vehicle?.vehicleNumber} (${vehicleType})!`,
        severity: 'success'
      })
      
      // Switch to the appropriate tab based on vehicle type
      if (vehicleType === 'LORRY') {
        console.log('🔄 Switching to LORRY tab (index 0)')
        setActiveTab(0) // Lorry Vehicles tab
      } else if (vehicleType === 'TRUCK_AUTO') {
        console.log('🔄 Switching to TRUCK_AUTO tab (index 1)')
        setActiveTab(1) // Truck/Auto Vehicles tab
      }
      
      // Reset form to default values
      reset({
        vehicleId: '',
        transactionType: 'INCOME',
        amount: '',
        description: '',
        transactionDate: new Date().toISOString().split('T')[0],
        incomeType: 'RENTAL',
        expenseType: 'PETROL'
      })
      
      // Emit socket event for real-time updates (compatibility)
      emit('transaction-created', {
        type: 'vehicle',
        transaction: result
      })
      
    } catch (error) {
      console.error('Transaction submission error:', error)
      setSnackbar({
        open: true,
        message: 'Error adding transaction: ' + error.message,
        severity: 'error'
      })
    } finally {
      // Add a minimum loading time to prevent rapid successive submissions
      setTimeout(() => {
        setLoading(false)
      }, 2000)
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

  const getVehiclesByType = (type) => {
    return vehicles.filter(vehicle => vehicle.vehicleType === type)
  }

  const getTransactionsByVehicleType = (type) => {
    const vehicleIds = getVehiclesByType(type).map(v => v.id)
    return transactions.filter(t => vehicleIds.includes(t.vehicleId))
  }

  const calculateProfitForType = (type) => {
    const typeTransactions = getTransactionsByVehicleType(type)
    const income = typeTransactions
      .filter(t => t.transactionType === 'INCOME')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
    const expenses = typeTransactions
      .filter(t => t.transactionType === 'EXPENSE')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
    return income - expenses
  }

  const VehicleAnalytics = ({ vehicleType }) => {
    const { analytics, loading: analyticsLoading } = useVehicleAnalytics(vehicleType, 7)
    
    if (analyticsLoading || !analytics) {
      return (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Alert severity="info">Loading analytics...</Alert>
          </Grid>
        </Grid>
      )
    }
    
    const typeTransactions = analytics.transactions
    const profit = analytics.profit
    
    // Prepare chart data for profit trends
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date
    })
    
    const dailyProfits = last7Days.map(date => {
      const dayTransactions = typeTransactions.filter(t => {
        const transactionDate = t.transactionDate instanceof Date ? t.transactionDate : new Date(t.transactionDate)
        return transactionDate.toDateString() === date.toDateString()
      })
      
      const dayIncome = dayTransactions
        .filter(t => t.transactionType === 'INCOME')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      const dayExpenses = dayTransactions
        .filter(t => t.transactionType === 'EXPENSE')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      
      return dayIncome - dayExpenses
    })
    
    const chartData = {
      labels: last7Days.map(date => date.toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric' 
      })),
      datasets: [
        {
          label: `${vehicleType} Daily Profit`,
          data: dailyProfits,
          borderColor: vehicleType === 'LORRY' ? 'rgb(54, 162, 235)' : 'rgb(255, 99, 132)',
          backgroundColor: vehicleType === 'LORRY' ? 'rgba(54, 162, 235, 0.1)' : 'rgba(255, 99, 132, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    }
    
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `${vehicleType} Profit Trend (Last 7 Days)`
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
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Profit Trend Analysis
              </Typography>
              <Box sx={{ height: 250, position: 'relative' }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
            </CardContent>
          </StyledCard>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Performance Metrics
              </Typography>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Average Daily Profit
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color={profit >= 0 ? 'success.main' : 'error.main'}>
                    {formatCurrency(dailyProfits.reduce((a, b) => a + b, 0) / 7)}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Best Day (Last 7 Days)
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(Math.max(...dailyProfits))}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Transactions
                  </Typography>
                  <Typography variant="h6">
                    {typeTransactions.length}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Profit Margin
                  </Typography>
                  <Typography variant="h6" color={profit >= 0 ? 'success.main' : 'error.main'}>
                    {profit >= 0 ? '+' : ''}{((profit / Math.max(1, typeTransactions.reduce((sum, t) => 
                      t.transactionType === 'INCOME' ? sum + parseFloat(t.amount) : sum, 0))) * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </StyledCard>
        </Grid>
        
        <Grid item xs={12}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Transaction History
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Vehicle</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {typeTransactions
                      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
                      .slice(0, 10)
                      .map((transaction) => {
                        const vehicle = vehicles.find(v => v.id === transaction.vehicleId)
                        return (
                          <TableRow key={transaction.id} hover>
                            <TableCell>
                              {new Date(transaction.transactionDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {vehicle?.vehicleNumber || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={transaction.transactionType}
                                color={transaction.transactionType === 'INCOME' ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell 
                              align="right"
                              sx={{ 
                                color: transaction.transactionType === 'INCOME' ? 'success.main' : 'error.main',
                                fontWeight: 'bold'
                              }}
                            >
                              {formatCurrency(transaction.amount)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
              {typeTransactions.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No transactions found for {vehicleType.toLowerCase()} vehicles.
                </Alert>
              )}
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
    )
  }

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )

  const VehicleTypeSection = ({ type, icon, color }) => {
    const typeVehicles = getVehiclesByType(type)
    const typeTransactions = getTransactionsByVehicleType(type)
    const profit = calculateProfitForType(type)

    return (
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <StyledCard>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                <Box sx={{ color: color }}>
                  {icon}
                </Box>
                <Typography variant="h6" fontWeight="bold">
                  {type} Summary
                </Typography>
              </Stack>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Vehicles
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {typeVehicles.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Profit
                  </Typography>
                  <Typography 
                    variant="h5" 
                    fontWeight="bold" 
                    color={profit >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(profit)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Transactions
                  </Typography>
                  <Typography variant="h6">
                    {typeTransactions.length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </StyledCard>
        </Grid>

        {/* Vehicle List */}
        <Grid item xs={12} md={8}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {type} Vehicles
              </Typography>
              {typeVehicles.length === 0 ? (
                <Alert severity="info">
                  No {type.toLowerCase()} vehicles found. Add vehicles using the API.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Vehicle Number</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Income</TableCell>
                        <TableCell align="right">Expenses</TableCell>
                        <TableCell align="right">Profit</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {typeVehicles.map((vehicle) => {
                        const vehicleTransactions = transactions.filter(t => t.vehicleId === vehicle.id)
                        const income = vehicleTransactions
                          .filter(t => t.transactionType === 'INCOME')
                          .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                        const expenses = vehicleTransactions
                          .filter(t => t.transactionType === 'EXPENSE')
                          .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                        const vehicleProfit = income - expenses

                        return (
                          <TableRow key={vehicle.id} hover>
                            <TableCell>{vehicle.vehicleNumber}</TableCell>
                            <TableCell>{vehicle.vehicleType}</TableCell>
                            <TableCell align="right" sx={{ color: 'success.main' }}>
                              {formatCurrency(income)}
                            </TableCell>
                            <TableCell align="right" sx={{ color: 'error.main' }}>
                              {formatCurrency(expenses)}
                            </TableCell>
                            <TableCell 
                              align="right" 
                              sx={{ 
                                color: vehicleProfit >= 0 ? 'success.main' : 'error.main',
                                fontWeight: 'bold'
                              }}
                            >
                              {formatCurrency(vehicleProfit)}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton 
                                size="small" 
                                onClick={() => {
                                  setSelectedVehicle(vehicle)
                                  setOpenDialog(true)
                                }}
                              >
                                <Visibility />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
    )
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Vehicle Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage vehicle transactions and track profitability
        </Typography>
      </Box>

      {/* Transaction Form */}
      <StyledCard sx={{ mb: 4, opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
        <CardContent>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Add New Transaction
            {/* Debug Info */}
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
              Firebase: {vehicles.length} vehicles, {transactions.length} transactions loaded
            </Typography>
          </Typography>
          {(loading || transactionsLoading) && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Processing transaction... Please wait and do not refresh the page.
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} key="vehicle-transaction-form">
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={2}>
                <Controller
                  name="vehicleId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.vehicleId}>
                      <InputLabel>Vehicle</InputLabel>
                      <Select {...field} label="Vehicle" disabled={vehiclesLoading}>
                        {vehiclesLoading ? (
                          <MenuItem disabled>Loading vehicles...</MenuItem>
                        ) : vehicles.length === 0 ? (
                          <MenuItem disabled>No vehicles found</MenuItem>
                        ) : (
                          vehicles.map((vehicle) => (
                            <MenuItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.vehicleNumber} - {vehicle.vehicleType}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                      {errors.vehicleId && (
                        <Typography variant="caption" color="error">
                          {errors.vehicleId.message}
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
                        <MenuItem value="INCOME">Income</MenuItem>
                        <MenuItem value="EXPENSE">Expense</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              {watchTransactionType === 'INCOME' && (
                <Grid item xs={12} sm={6} md={2}>
                  <Controller
                    name="incomeType"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.incomeType}>
                        <InputLabel>Income Type</InputLabel>
                        <Select {...field} label="Income Type">
                          <MenuItem value="RENTAL">Rental</MenuItem>
                          <MenuItem value="TRANSPORTATION">Transportation</MenuItem>
                        </Select>
                        {errors.incomeType && (
                          <Typography variant="caption" color="error">
                            {errors.incomeType.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
              )}
              {watchTransactionType === 'EXPENSE' && (
                <Grid item xs={12} sm={6} md={2}>
                  <Controller
                    name="expenseType"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.expenseType}>
                        <InputLabel>Expense Type</InputLabel>
                        <Select {...field} label="Expense Type">
                          <MenuItem value="PETROL">Petrol</MenuItem>
                          <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
                          <MenuItem value="REPAIRS">Repairs</MenuItem>
                          <MenuItem value="OTHER">Other</MenuItem>
                        </Select>
                        {errors.expenseType && (
                          <Typography variant="caption" color="error">
                            {errors.expenseType.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
              )}
              <Grid item xs={12} sm={6} md={2}>
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Amount (₹)"
                      type="number"
                      error={!!errors.amount}
                      helperText={errors.amount?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
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
              <Grid item xs={12} md={2}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Description"
                      error={!!errors.description}
                      helperText={errors.description?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading || vehiclesLoading}
                  startIcon={<Add />}
                  sx={{ minWidth: 150 }}
                >
                  {loading ? 'Adding...' : 'Add Transaction'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </StyledCard>

      {/* Vehicle Type Tabs */}
      <StyledCard>
        <CardContent>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            <Tab 
              label="Lorry Vehicles" 
              icon={<LocalShipping />} 
              iconPosition="start"
            />
            <Tab 
              label="Truck/Auto Vehicles" 
              icon={<DirectionsCar />} 
              iconPosition="start"
            />
            <Tab 
              label="Lorry Analytics" 
              icon={<Assessment />} 
              iconPosition="start"
            />
            <Tab 
              label="Truck/Auto Analytics" 
              icon={<Assessment />} 
              iconPosition="start"
            />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <VehicleTypeSection 
              type="LORRY" 
              icon={<LocalShipping sx={{ fontSize: 32 }} />}
              color="primary.main"
            />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <VehicleTypeSection 
              type="TRUCK_AUTO" 
              icon={<DirectionsCar sx={{ fontSize: 32 }} />}
              color="secondary.main"
            />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <VehicleAnalytics vehicleType="LORRY" />
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <VehicleAnalytics vehicleType="TRUCK_AUTO" />
          </TabPanel>
        </CardContent>
      </StyledCard>

      {/* Vehicle Details Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Vehicle Details: {selectedVehicle?.vehicleNumber}
        </DialogTitle>
        <DialogContent>
          {selectedVehicle && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <strong>Type:</strong> {selectedVehicle.vehicleType}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Registration:</strong> {selectedVehicle.vehicleNumber}
              </Typography>
              
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Recent Transactions
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions
                      .filter(t => t.vehicleId === selectedVehicle.id)
                      .slice(0, 10)
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {new Date(transaction.transactionDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={transaction.transactionType}
                              color={transaction.transactionType === 'INCOME' ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell 
                            align="right"
                            sx={{ 
                              color: transaction.transactionType === 'INCOME' ? 'success.main' : 'error.main'
                            }}
                          >
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog} 
        onClose={() => {
          setConfirmDialog(false)
          setPendingFormData(null)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Transaction
        </DialogTitle>
        <DialogContent>
          {pendingFormData && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Please confirm the transaction details:
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Vehicle:</strong> {vehicles.find(v => v.id === pendingFormData.vehicleId)?.vehicleNumber || 'Unknown'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Type:</strong> {pendingFormData.transactionType}
                {pendingFormData.transactionType === 'INCOME' && ` (${pendingFormData.incomeType})`}
                {pendingFormData.transactionType === 'EXPENSE' && ` (${pendingFormData.expenseType})`}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Amount:</strong> ₹{pendingFormData.amount}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Description:</strong> {pendingFormData.description}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Date:</strong> {new Date(pendingFormData.transactionDate).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setConfirmDialog(false)
              setPendingFormData(null)
            }}
            color="secondary"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmSubmit}
            color="primary"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Confirm & Add'}
          </Button>
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

export default VehicleManagement