import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

// API slices will be implemented in later tasks
import { authApi } from './api/authApi'

export const store = configureStore({
  reducer: {
    // Add API reducers
    [authApi.reducerPath]: authApi.reducer,
    // Additional slices will be added in later tasks
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      }
    }).concat(
      authApi.middleware
      // Additional API middleware will be added in later tasks
    ),
  devTools: process.env.NODE_ENV !== 'production'
})

// Enable listener behavior for the store
setupListeners(store.dispatch)

export default store