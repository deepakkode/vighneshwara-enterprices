import React from 'react'
import { IconButton, Tooltip, useTheme as useMuiTheme } from '@mui/material'
import { Brightness4, Brightness7 } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'

const MotionIconButton = motion(IconButton)

const ThemeToggle = ({ size = 'medium', ...props }) => {
  const { mode, toggleTheme } = useTheme()
  const muiTheme = useMuiTheme()

  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
      <MotionIconButton
        onClick={toggleTheme}
        size={size}
        sx={{
          color: muiTheme.palette.text.primary,
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: muiTheme.palette.action.hover,
            transform: 'scale(1.1)'
          }
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ rotate: 0 }}
        animate={{ rotate: mode === 'dark' ? 180 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        {...props}
      >
        {mode === 'light' ? (
          <Brightness4 />
        ) : (
          <Brightness7 />
        )}
      </MotionIconButton>
    </Tooltip>
  )
}

export default ThemeToggle