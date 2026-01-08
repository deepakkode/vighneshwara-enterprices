import React from 'react'
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Button, 
  Container,
  Stack,
  Alert
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { useLoginMutation } from '../store/api/authApi'

const schema = yup.object({
  username: yup.string().required('Username is required'),
  password: yup.string().required('Password is required')
})

const Login = () => {
  const navigate = useNavigate()
  const [login, { isLoading, error }] = useLoginMutation()
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema)
  })

  const onSubmit = async (data) => {
    try {
      const result = await login(data).unwrap()
      if (result.success) {
        toast.success('Login successful!')
        navigate('/')
      }
    } catch (err) {
      toast.error(err?.data?.error?.message || 'Login failed')
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #E53E3E 0%, #3182CE 50%, #38A169 100%)'
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={4}>
              <Typography 
                variant="h4" 
                fontWeight="bold" 
                sx={{
                  background: 'linear-gradient(135deg, #E53E3E 0%, #3182CE 50%, #38A169 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
                gutterBottom
              >
                VIGHNESHWARA
              </Typography>
              <Typography variant="h6" color="text.secondary">
                ENTERPRISES
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                Sign in to your dashboard
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error?.data?.error?.message || 'Login failed'}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={3}>
                <TextField
                  fullWidth
                  label="Username"
                  {...register('username')}
                  error={!!errors.username}
                  helperText={errors.username?.message}
                />
                
                <TextField
                  fullWidth
                  type="password"
                  label="Password"
                  {...register('password')}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading}
                  sx={{ mt: 3 }}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Stack>
            </form>

            <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="caption" color="text.secondary" display="block">
                <strong>Demo Credentials:</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Username: admin | Password: admin123
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Username: operator | Password: operator123
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  )
}

export default Login