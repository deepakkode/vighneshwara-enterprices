import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const baseQuery = fetchBaseQuery({
  baseUrl: '/api/auth',
  prepareHeaders: (headers, { getState }) => {
    // Add auth token to headers when available
    const token = localStorage.getItem('token')
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    return headers
  }
})

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery,
  tagTypes: ['User'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/login',
        method: 'POST',
        body: credentials
      }),
      transformResponse: (response) => {
        // Store token in localStorage
        if (response.success && response.data.token) {
          localStorage.setItem('token', response.data.token)
          localStorage.setItem('refreshToken', response.data.refreshToken)
          localStorage.setItem('user', JSON.stringify(response.data.user))
        }
        return response
      }
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/register',
        method: 'POST',
        body: userData
      }),
      transformResponse: (response) => {
        // Store token in localStorage
        if (response.success && response.data.token) {
          localStorage.setItem('token', response.data.token)
          localStorage.setItem('refreshToken', response.data.refreshToken)
          localStorage.setItem('user', JSON.stringify(response.data.user))
        }
        return response
      }
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/logout',
        method: 'POST'
      }),
      transformResponse: () => {
        // Clear localStorage
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        return { success: true }
      }
    })
  })
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation
} = authApi