import React from 'react'
import { Typography, Box } from '@mui/material'

const Test = () => {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h2" color="primary" gutterBottom>
        🎉 React is Working!
      </Typography>
      <Typography variant="h4" gutterBottom>
        VIGHNESHWARA ENTERPRISES
      </Typography>
      <Typography variant="body1">
        If you can see this page, the React app is running correctly.
      </Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Current time: {new Date().toLocaleString()}
      </Typography>
    </Box>
  )
}

export default Test