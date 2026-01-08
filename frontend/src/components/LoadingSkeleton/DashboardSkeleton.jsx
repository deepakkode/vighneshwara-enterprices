import { Box, Grid, Skeleton, Card, CardContent, Stack } from '@mui/material'

const MetricCardSkeleton = () => (
  <Card sx={{ 
    height: '100%', 
    background: 'rgba(255, 255, 255, 0.1)', 
    backdropFilter: 'blur(10px)' 
  }}>
    <CardContent sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        minHeight: 40
      }}>
        <Skeleton variant="circular" width={48} height={48} />
        <Skeleton variant="rounded" width={60} height={24} />
      </Box>
      <Skeleton 
        variant="text" 
        width="80%" 
        height={48} 
        sx={{ 
          mb: 1,
          fontSize: { xs: '1.5rem', sm: '2rem' }
        }} 
      />
      <Skeleton 
        variant="text" 
        width="60%" 
        height={20}
        sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
      />
    </CardContent>
  </Card>
)

const ChartSkeleton = ({ height = 300 }) => (
  <Card sx={{ height: '100%', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
    <CardContent>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Skeleton variant="rectangular" width="100%" height="80%" />
      </Box>
    </CardContent>
  </Card>
)

const DashboardSkeleton = () => {
  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3, md: 4 }, 
      maxWidth: '1400px', 
      mx: 'auto',
      minHeight: '100vh'
    }}>
      {/* Header Skeleton */}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
        >
          <Box>
            <Skeleton 
              variant="text" 
              width="60%" 
              height={48} 
              sx={{ mb: 1, fontSize: { xs: '1.75rem', sm: '2.125rem', md: '3rem' } }} 
            />
            <Skeleton variant="text" width="80%" height={24} />
          </Box>
          <Skeleton variant="rounded" width={120} height={24} />
        </Stack>
      </Box>

      {/* Metrics Grid Skeleton */}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} lg={3} key={item}>
              <MetricCardSkeleton />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Quick Actions & Chart Skeleton */}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              height: '100%'
            }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Skeleton variant="text" width="30%" height={32} sx={{ mb: 1 }} />
                <Skeleton variant="text" width="50%" height={20} sx={{ mb: 3 }} />
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={2}
                  sx={{ mb: 2 }}
                >
                  {[1, 2, 3].map((item) => (
                    <Skeleton 
                      key={item} 
                      variant="rounded" 
                      width={180} 
                      height={48} 
                      sx={{ width: { xs: '100%', sm: 180 } }}
                    />
                  ))}
                </Stack>
                <Skeleton variant="text" width="70%" height={16} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={4}>
            <ChartSkeleton height={200} />
          </Grid>
        </Grid>
      </Box>

      {/* Charts Section Skeleton */}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12} lg={8}>
            <ChartSkeleton height={300} />
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              height: '100%'
            }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
                <Stack spacing={3}>
                  {[1, 2, 3, 4].map((item) => (
                    <Box key={item}>
                      <Skeleton variant="text" width="60%" height={20} sx={{ mb: 0.5 }} />
                      <Skeleton variant="text" width="40%" height={28} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default DashboardSkeleton