import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const Preloader = ({ message = 'Loading Dashboard...', progress = null }) => {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            VIGHNESHWARA
          </Typography>
          <Typography variant="h4" fontWeight="300" sx={{ mb: 4 }}>
            ENTERPRISES
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <CircularProgress 
              size={60} 
              thickness={4} 
              sx={{ color: 'rgba(255, 255, 255, 0.8)' }} 
            />
          </Box>
          
          <Typography variant="h6" sx={{ mb: 2, minHeight: 32 }}>
            {message}{dots}
          </Typography>
          
          {progress !== null && (
            <Box sx={{ width: 300, mx: 'auto' }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'rgba(255, 255, 255, 0.8)'
                  }
                }} 
              />
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                {Math.round(progress)}% Complete
              </Typography>
            </Box>
          )}
        </Box>
      </motion.div>
    </Box>
  )
}

export default Preloader