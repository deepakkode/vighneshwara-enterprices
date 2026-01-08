import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Button,
  Stack
} from '@mui/material'
import { 
  Dashboard as DashboardIcon,
  DirectionsCar,
  Recycling,
  Receipt
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'
import { motion } from 'framer-motion'
import ThemeToggle from '../ThemeToggle/ThemeToggle'
import PageTransition from '../PageTransition/PageTransition'

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(26, 27, 58, 0.8)' 
    : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(20px)',
  color: theme.palette.text.primary,
  boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
  borderBottom: `1px solid ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(0, 0, 0, 0.1)'}`
}))

const CompanyLogo = styled(Typography)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 50%, ${theme.palette.success.main} 100%)`,
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 700,
  fontSize: '1.5rem',
  letterSpacing: '0.5px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.05)'
  }
}))

const MotionButton = motion(Button)

const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const navigationItems = [
    { path: '/', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/vehicles', label: 'Vehicles', icon: <DirectionsCar /> },
    { path: '/scrap', label: 'Scrap Trading', icon: <Recycling /> },
    { path: '/bills', label: 'Bills', icon: <Receipt /> }
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <StyledAppBar position="sticky">
        <Toolbar>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <CompanyLogo 
              variant="h6" 
              component="div" 
              sx={{ flexGrow: 1 }}
              onClick={() => navigate('/')}
            >
              VIGHNESHWARA ENTERPRISES
            </CompanyLogo>
          </motion.div>
          
          <Stack direction="row" spacing={1} sx={{ mr: 2, ml: 'auto' }}>
            {navigationItems.map((item, index) => (
              <MotionButton
                key={item.path}
                color="inherit"
                startIcon={item.icon}
                onClick={() => navigate(item.path)}
                variant={location.pathname === item.path ? 'outlined' : 'text'}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  borderRadius: 2,
                  ...(location.pathname === item.path && {
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    borderColor: 'currentColor'
                  })
                }}
              >
                {item.label}
              </MotionButton>
            ))}
          </Stack>
          
          <ThemeToggle sx={{ mr: 2 }} />
          
          <Typography variant="body2" color="text.secondary">
            Dashboard v1.0
          </Typography>
        </Toolbar>
      </StyledAppBar>
      
      <Container 
        maxWidth="xl" 
        sx={{ 
          flexGrow: 1, 
          py: 3,
          px: { xs: 2, sm: 3 }
        }}
      >
        <PageTransition>
          <Outlet />
        </PageTransition>
      </Container>
    </Box>
  )
}

export default Layout