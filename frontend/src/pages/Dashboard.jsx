import { useEffect, useState, Suspense, lazy, useMemo, useCallback } from 'react'
import { 
  Box, 
  Typography, 
  Grid, 
  Chip,
  Button,
  Stack,
  CircularProgress,
  Skeleton
} from '@mui/material'
import { 
  TrendingUp, 
  DirectionsCar, 
  Recycling, 
  Receipt,
  Wifi,
  WifiOff
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useDashboard, useChartData } from '../hooks/useApi'
import AnimatedCard, { AnimatedCardContent } from '../components/AnimatedCard/AnimatedCard'
import { AnimatedFab } from '../components/AnimatedButton/AnimatedButton'
import { StaggerContainer, FadeInUp } from '../components/PageTransition/PageTransition'
import DashboardSkeleton from '../components/LoadingSkeleton/DashboardSkeleton'
import { cacheManager, performanceMonitor } from '../utils/performance'

// Lazy load chart components to reduce initial bundle size
const LazyLineChart = lazy(() => import('../components/Charts/LineChart'))
const LazyDoughnutChart = lazy(() => import('../components/Charts/DoughnutChart'))

// Register Chart.js components - moved to lazy components

const MetricCard = ({ title, value, icon, color, trend, loading, delay = 0 }) => (
  <AnimatedCard delay={delay} glass>
    <AnimatedCardContent sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
      <Stack 
        direction="row" 
        alignItems="center" 
        justifyContent="space-between" 
        sx={{ mb: 2, minHeight: 40 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.3 }}
        >
          <Box sx={{ 
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48
          }}>
            {loading ? (
              <Skeleton variant="circular" width={40} height={40} />
            ) : (
              icon
            )}
          </Box>
        </motion.div>
        {trend && !loading && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.4, duration: 0.3 }}
          >
            <Chip 
              label={`${trend > 0 ? '+' : ''}${trend.toFixed(1)}%`}
              size="small" 
              color={trend > 0 ? 'success' : trend < 0 ? 'error' : 'default'}
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          </motion.div>
        )}
        {loading && (
          <Skeleton variant="rounded" width={60} height={24} />
        )}
      </Stack>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.3, duration: 0.3 }}
      >
        <Typography 
          variant="h4" 
          fontWeight="bold" 
          color={color} 
          sx={{ 
            mb: 1,
            fontSize: { xs: '1.5rem', sm: '2rem' },
            lineHeight: 1.2,
            minHeight: { xs: 36, sm: 48 }
          }}
        >
          {loading ? (
            <Skeleton variant="text" width="80%" height={48} />
          ) : (
            value
          )}
        </Typography>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.5, duration: 0.3 }}
      >
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            fontSize: { xs: '0.875rem', sm: '1rem' },
            lineHeight: 1.4
          }}
        >
          {loading ? (
            <Skeleton variant="text" width="60%" />
          ) : (
            title
          )}
        </Typography>
      </motion.div>
    </AnimatedCardContent>
  </AnimatedCard>
)

const ConnectionStatus = ({ connected }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
    {connected ? (
      <>
        <Wifi color="success" fontSize="small" />
        <Typography variant="caption" color="success.main">
          Live Updates Active
        </Typography>
      </>
    ) : (
      <>
        <WifiOff color="error" fontSize="small" />
        <Typography variant="caption" color="error.main">
          Connecting...
        </Typography>
      </>
    )}
  </Box>
)

const Dashboard = () => {
  const { dashboardData, connected, refreshDashboardData, loading: dashboardLoading } = useDashboard()
  const { chartData, weeklyData, loading: chartLoading, refreshChartData } = useChartData()
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Memoize formatted currency to prevent recalculation
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }, [])

  // Update loading state based on Firebase loading
  useEffect(() => {
    setLoading(dashboardLoading)
  }, [dashboardLoading])

  // Load chart data when dashboard data is ready
  useEffect(() => {
    if (!dashboardLoading && !chartData) {
      refreshChartData()
    }
  }, [dashboardLoading, chartData, refreshChartData])

  // Memoize doughnut chart data to prevent recalculation
  const doughnutData = useMemo(() => ({
    labels: ['Vehicle Earnings', 'Scrap Trading'],
    datasets: [
      {
        data: [dashboardData.vehicleEarnings || 0, dashboardData.scrapTrading || 0],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 2
      }
    ]
  }), [dashboardData.vehicleEarnings, dashboardData.scrapTrading])

  // Show skeleton loader for initial load
  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3, md: 4 }, 
      maxWidth: '1400px', 
      mx: 'auto',
      minHeight: '100vh'
    }}>
      <StaggerContainer>
        {/* Header Section */}
        <FadeInUp delay={0}>
          <Box sx={{ mb: { xs: 3, md: 4 } }}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              justifyContent="space-between" 
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
            >
              <Box>
                <Typography 
                  variant="h3" 
                  fontWeight="bold" 
                  gutterBottom
                  sx={{ 
                    fontSize: { xs: '1.75rem', sm: '2.125rem', md: '3rem' },
                    lineHeight: 1.2
                  }}
                >
                  Welcome to Dashboard
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                >
                  Modern business management for Vighneshwara Enterprises
                </Typography>
              </Box>
              <ConnectionStatus connected={connected} />
            </Stack>
            
            {dashboardData.lastUpdated && (
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ mt: 1, display: 'block', fontSize: '0.75rem' }}
              >
                Last updated: {new Date(dashboardData.lastUpdated).toLocaleString()}
              </Typography>
            )}
          </Box>
        </FadeInUp>

        {/* Metrics Grid */}
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Today's Total Profit"
                value={formatCurrency(dashboardData.totalProfit)}
                icon={<TrendingUp sx={{ fontSize: { xs: 32, sm: 40 } }} />}
                color="success.main"
                trend={dashboardData.trends?.totalProfitTrend}
                loading={loading}
                delay={0.1}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Vehicle Earnings"
                value={formatCurrency(dashboardData.vehicleEarnings)}
                icon={<DirectionsCar sx={{ fontSize: { xs: 32, sm: 40 } }} />}
                color="primary.main"
                trend={dashboardData.trends?.vehicleProfitTrend}
                loading={loading}
                delay={0.2}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Scrap Trading"
                value={formatCurrency(dashboardData.scrapTrading)}
                icon={<Recycling sx={{ fontSize: { xs: 32, sm: 40 } }} />}
                color="secondary.main"
                trend={dashboardData.trends?.scrapProfitTrend}
                loading={loading}
                delay={0.3}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <MetricCard
                title="Bills Generated"
                value={dashboardData.billsGenerated?.toString() || '0'}
                icon={<Receipt sx={{ fontSize: { xs: 32, sm: 40 } }} />}
                color="warning.main"
                loading={loading}
                delay={0.4}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Quick Actions & Profit Distribution */}
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} lg={8}>
              <AnimatedCard delay={0.5} glass>
                <AnimatedCardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Typography 
                    variant="h5" 
                    fontWeight="bold" 
                    gutterBottom
                    sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                  >
                    Quick Actions
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ mb: 3, fontSize: { xs: '0.875rem', sm: '1rem' } }}
                  >
                    Get started with common tasks
                  </Typography>
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={2}
                    sx={{ mb: 2 }}
                  >
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={() => navigate('/vehicles')}
                      sx={{ 
                        minWidth: { xs: '100%', sm: 180 },
                        py: 1.5,
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                      startIcon={<DirectionsCar />}
                    >
                      Add Vehicle Income
                    </Button>
                    <Button 
                      variant="contained" 
                      color="secondary"
                      onClick={() => navigate('/scrap')}
                      sx={{ 
                        minWidth: { xs: '100%', sm: 180 },
                        py: 1.5,
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                      startIcon={<Recycling />}
                    >
                      Record Scrap Purchase
                    </Button>
                    <Button 
                      variant="contained" 
                      color="success"
                      disabled
                      sx={{ 
                        minWidth: { xs: '100%', sm: 180 },
                        py: 1.5,
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                      startIcon={<Receipt />}
                    >
                      Generate Bill
                    </Button>
                  </Stack>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '0.75rem' }}
                  >
                    Vehicle and Scrap management are now available! Bill generation coming soon.
                  </Typography>
                </AnimatedCardContent>
              </AnimatedCard>
            </Grid>
            
            <Grid item xs={12} lg={4}>
              <AnimatedCard delay={0.6} glass>
                <AnimatedCardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Typography 
                    variant="h6" 
                    fontWeight="bold" 
                    gutterBottom
                    sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
                  >
                    Profit Distribution
                  </Typography>
                  <Box sx={{ 
                    height: { xs: 180, sm: 200 }, 
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {loading || !doughnutData ? (
                      <CircularProgress />
                    ) : (
                      <Suspense fallback={<CircularProgress />}>
                        <LazyDoughnutChart data={doughnutData} />
                      </Suspense>
                    )}
                  </Box>
                </AnimatedCardContent>
              </AnimatedCard>
            </Grid>
          </Grid>
        </Box>

        {/* Charts Section */}
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} lg={8}>
              <AnimatedCard delay={0.7} glass>
                <AnimatedCardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Typography 
                    variant="h6" 
                    fontWeight="bold" 
                    gutterBottom
                    sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
                  >
                    Weekly Profit Trends
                  </Typography>
                  <Box sx={{ 
                    height: { xs: 250, sm: 300 }, 
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {chartLoading || !chartData ? (
                      <CircularProgress />
                    ) : (
                      <Suspense fallback={<CircularProgress />}>
                        <LazyLineChart data={chartData} />
                      </Suspense>
                    )}
                  </Box>
                </AnimatedCardContent>
              </AnimatedCard>
            </Grid>
            
            <Grid item xs={12} lg={4}>
              <AnimatedCard delay={0.8} glass>
                <AnimatedCardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Typography 
                    variant="h6" 
                    fontWeight="bold" 
                    gutterBottom
                    sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
                  >
                    Weekly Summary
                  </Typography>
                  {chartLoading || !weeklyData ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <Stack spacing={3}>
                      <Box>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ fontSize: '0.875rem', mb: 0.5 }}
                        >
                          Total Business Profit
                        </Typography>
                        <Typography 
                          variant="h5" 
                          fontWeight="bold" 
                          color="success.main"
                          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                        >
                          {formatCurrency(weeklyData.weeklyTotals?.totalBusinessProfit)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ fontSize: '0.875rem', mb: 0.5 }}
                        >
                          Vehicle Earnings
                        </Typography>
                        <Typography 
                          variant="h6" 
                          color="primary.main"
                          sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
                        >
                          {formatCurrency(weeklyData.weeklyTotals?.totalVehicleProfit)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ fontSize: '0.875rem', mb: 0.5 }}
                        >
                          Scrap Trading
                        </Typography>
                        <Typography 
                          variant="h6" 
                          color="secondary.main"
                          sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
                        >
                          {formatCurrency(weeklyData.weeklyTotals?.scrapProfit)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ fontSize: '0.875rem', mb: 0.5 }}
                        >
                          Total Transactions
                        </Typography>
                        <Typography 
                          variant="h6"
                          sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
                        >
                          {weeklyData.weeklyTotals?.transactionCount || 0}
                        </Typography>
                      </Box>
                    </Stack>
                  )}
                </AnimatedCardContent>
              </AnimatedCard>
            </Grid>
          </Grid>
        </Box>

        {/* Floating Action Buttons */}
        <Box sx={{ 
          position: 'fixed', 
          bottom: { xs: 16, sm: 24 }, 
          right: { xs: 16, sm: 24 }, 
          zIndex: 1000
        }}>
          <Stack spacing={2}>
            <AnimatedFab 
              color="primary" 
              aria-label="add vehicle transaction"
              onClick={() => navigate('/vehicles')}
              size={window.innerWidth < 600 ? 'medium' : 'large'}
              pulse
              sx={{ boxShadow: 3 }}
            >
              <DirectionsCar />
            </AnimatedFab>
            <AnimatedFab 
              color="secondary" 
              aria-label="add scrap transaction"
              onClick={() => navigate('/scrap')}
              size={window.innerWidth < 600 ? 'medium' : 'large'}
              sx={{ boxShadow: 3 }}
            >
              <Recycling />
            </AnimatedFab>
            <AnimatedFab 
              color="success" 
              aria-label="generate bill"
              onClick={() => navigate('/bills')}
              size={window.innerWidth < 600 ? 'medium' : 'large'}
              sx={{ boxShadow: 3 }}
            >
              <Receipt />
            </AnimatedFab>
          </Stack>
        </Box>
      </StaggerContainer>
    </Box>
  )
}

export default Dashboard