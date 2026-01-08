import { useEffect, useState, Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Box, Snackbar, Alert, Button, CircularProgress } from '@mui/material'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'

// Components
import Layout from './components/Layout/Layout'
import Preloader from './components/Preloader/Preloader'
import { ApiProvider } from './context/ApiContext'
import { ThemeContextProvider } from './context/ThemeContext'

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'))
const VehicleManagement = lazy(() => import('./pages/VehicleManagement'))
const ScrapManagement = lazy(() => import('./pages/ScrapManagement'))
const BillManagement = lazy(() => import('./pages/BillManagement'))

// PWA utilities
import { 
  registerServiceWorker, 
  checkOnlineStatus, 
  addOfflineEventListeners,
  initOfflineDB,
  syncPendingTransactions,
  showInstallPrompt
} from './utils/pwa'

// Performance utilities
import { performanceMonitor, cacheManager } from './utils/performance'

// Loading component for lazy routes
const PageLoader = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="400px"
  >
    <CircularProgress size={40} />
  </Box>
)

function App() {
  const [isOnline, setIsOnline] = useState(checkOnlineStatus())
  const [showOfflineAlert, setShowOfflineAlert] = useState(false)
  const [pendingSync, setPendingSync] = useState(false)
  const [appLoading, setAppLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)

  useEffect(() => {
    // Performance monitoring
    const measureAppLoad = performanceMonitor.measureRender('App')

    // App initialization with progress
    const initializeApp = async () => {
      try {
        setLoadingProgress(10)
        
        // Initialize offline database
        await initOfflineDB()
        setLoadingProgress(30)
        
        // Register service worker
        registerServiceWorker()
        setLoadingProgress(50)
        
        // Clear expired cache
        cacheManager.clearExpiredCache()
        setLoadingProgress(70)
        
        // Add offline event listeners
        addOfflineEventListeners(
          () => {
            setIsOnline(true)
            setShowOfflineAlert(false)
            handleOnlineSync()
          },
          () => {
            setIsOnline(false)
            setShowOfflineAlert(true)
          }
        )
        setLoadingProgress(90)
        
        // Show install prompt
        showInstallPrompt()
        
        // Small delay to show the preloader
        await new Promise(resolve => setTimeout(resolve, 800))
        setLoadingProgress(100)
        
        setAppLoading(false)
        measureAppLoad()
      } catch (error) {
        console.error('App initialization error:', error)
        setAppLoading(false)
        measureAppLoad()
      }
    }

    initializeApp()
  }, [])

  const handleOnlineSync = async () => {
    setPendingSync(true)
    try {
      const results = await syncPendingTransactions()
      const successCount = results.filter(r => r.success).length
      if (successCount > 0) {
        console.log(`Synced ${successCount} pending transactions`)
      }
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setPendingSync(false)
    }
  }

  // Show preloader during app initialization
  if (appLoading) {
    return (
      <Preloader 
        message="Initializing Dashboard" 
        progress={loadingProgress} 
      />
    )
  }

  return (
    <ThemeContextProvider>
      <ApiProvider>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <AnimatePresence mode="wait">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="vehicles" element={<VehicleManagement />} />
                  <Route path="scrap" element={<ScrapManagement />} />
                  <Route path="bills" element={<BillManagement />} />
                </Route>
              </Routes>
            </Suspense>
          </AnimatePresence>
          
          {/* Offline Alert */}
          <Snackbar
            open={showOfflineAlert}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert 
              severity="warning" 
              sx={{ width: '100%' }}
              action={
                pendingSync ? (
                  <Button color="inherit" size="small" disabled>
                    Syncing...
                  </Button>
                ) : null
              }
            >
              You're offline. Changes will be saved and synced when you're back online.
            </Alert>
          </Snackbar>

          {/* Install Button */}
          <Button
            id="install-button"
            variant="contained"
            sx={{
              position: 'fixed',
              bottom: 16,
              left: 16,
              display: 'none',
              zIndex: 1000,
              background: 'linear-gradient(135deg, #E53E3E 0%, #3182CE 50%, #38A169 100%)'
            }}
          >
            Install App
          </Button>
          
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4caf50',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#f44336',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Box>
      </ApiProvider>
    </ThemeContextProvider>
  )
}

export default App