import React from 'react'
import { Button, Fab } from '@mui/material'
import { motion } from 'framer-motion'
import { styled } from '@mui/material/styles'

const MotionButton = motion(Button)
const MotionFab = motion(Fab)

const GlassButton = styled(MotionButton)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(255, 255, 255, 0.2)',
  backdropFilter: 'blur(10px)',
  border: `1px solid ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.2)' 
    : 'rgba(0, 0, 0, 0.1)'}`,
  color: theme.palette.text.primary,
  '&:hover': {
    background: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(255, 255, 255, 0.3)',
    border: `1px solid ${theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.3)' 
      : 'rgba(0, 0, 0, 0.2)'}`,
  }
}))

const AnimatedButton = ({ 
  children, 
  variant = 'contained',
  glass = false,
  pulse = false,
  ...props 
}) => {
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    tap: { 
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  }

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  }

  const ButtonComponent = glass ? GlassButton : MotionButton

  return (
    <ButtonComponent
      variants={pulse ? pulseVariants : buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      animate={pulse ? "pulse" : "initial"}
      variant={variant}
      {...props}
    >
      {children}
    </ButtonComponent>
  )
}

export const AnimatedFab = ({ 
  children, 
  pulse = false,
  ...props 
}) => {
  const fabVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: { 
      scale: 1.1,
      rotate: 5,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    tap: { 
      scale: 0.9,
      transition: { duration: 0.1 }
    }
  }

  const pulseVariants = {
    pulse: {
      scale: [1, 1.1, 1],
      boxShadow: [
        '0px 4px 8px rgba(0,0,0,0.2)',
        '0px 8px 16px rgba(0,0,0,0.3)',
        '0px 4px 8px rgba(0,0,0,0.2)'
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  }

  return (
    <MotionFab
      variants={pulse ? pulseVariants : fabVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      animate={pulse ? "pulse" : "initial"}
      {...props}
    >
      {children}
    </MotionFab>
  )
}

export default AnimatedButton