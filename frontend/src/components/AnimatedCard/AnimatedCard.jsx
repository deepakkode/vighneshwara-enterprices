import React from 'react'
import { Card, CardContent } from '@mui/material'
import { motion } from 'framer-motion'
import { styled } from '@mui/material/styles'

const MotionCard = motion(Card)

const GlassCard = styled(MotionCard)(({ theme }) => ({
  background: theme.palette.mode === 'dark' 
    ? 'rgba(26, 27, 58, 0.7)' 
    : 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(20px)',
  border: `1px solid ${theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(255, 255, 255, 0.2)'}`,
  borderRadius: 16,
  boxShadow: theme.palette.mode === 'dark'
    ? '0 8px 32px rgba(0, 0, 0, 0.3)'
    : '0 8px 32px rgba(0, 0, 0, 0.1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.palette.mode === 'dark'
      ? '0 12px 40px rgba(0, 0, 0, 0.4)'
      : '0 12px 40px rgba(0, 0, 0, 0.15)',
    border: `1px solid ${theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(255, 255, 255, 0.3)'}`
  }
}))

const AnimatedCard = ({ 
  children, 
  delay = 0, 
  duration = 0.5,
  glass = true,
  ...props 
}) => {
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    hover: {
      y: -4,
      transition: {
        duration: 0.2,
        ease: 'easeOut'
      }
    }
  }

  const CardComponent = glass ? GlassCard : MotionCard

  return (
    <CardComponent
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      layout
      {...props}
    >
      {children}
    </CardComponent>
  )
}

export const AnimatedCardContent = ({ children, ...props }) => {
  return (
    <CardContent {...props}>
      {children}
    </CardContent>
  )
}

export default AnimatedCard