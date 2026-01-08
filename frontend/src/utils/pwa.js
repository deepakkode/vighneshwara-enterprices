// PWA utilities for service worker registration and offline functionality

export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, show update notification
                showUpdateNotification()
              }
            })
          })
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
        })
    })
  }
}

export const showUpdateNotification = () => {
  if (window.confirm('New version available! Reload to update?')) {
    window.location.reload()
  }
}

export const checkOnlineStatus = () => {
  return navigator.onLine
}

export const addOfflineEventListeners = (onOnline, onOffline) => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

// IndexedDB for offline storage
export const initOfflineDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VighneshwaraDB', 1)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Create stores for offline data
      if (!db.objectStoreNames.contains('pendingTransactions')) {
        const store = db.createObjectStore('pendingTransactions', { keyPath: 'id', autoIncrement: true })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
      
      if (!db.objectStoreNames.contains('cachedData')) {
        const cacheStore = db.createObjectStore('cachedData', { keyPath: 'key' })
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
    
    request.onsuccess = (event) => {
      resolve(event.target.result)
    }
    
    request.onerror = (event) => {
      reject(event.target.error)
    }
  })
}

export const saveOfflineTransaction = async (transaction) => {
  try {
    const db = await initOfflineDB()
    const tx = db.transaction(['pendingTransactions'], 'readwrite')
    const store = tx.objectStore('pendingTransactions')
    
    const transactionWithTimestamp = {
      ...transaction,
      timestamp: Date.now(),
      synced: false
    }
    
    await store.add(transactionWithTimestamp)
    console.log('Transaction saved offline')
    return true
  } catch (error) {
    console.error('Failed to save offline transaction:', error)
    return false
  }
}

export const getPendingTransactions = async () => {
  try {
    const db = await initOfflineDB()
    const tx = db.transaction(['pendingTransactions'], 'readonly')
    const store = tx.objectStore('pendingTransactions')
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to get pending transactions:', error)
    return []
  }
}

export const syncPendingTransactions = async () => {
  try {
    const pendingTransactions = await getPendingTransactions()
    const results = []
    
    for (const transaction of pendingTransactions) {
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(transaction)
        })
        
        if (response.ok) {
          await removePendingTransaction(transaction.id)
          results.push({ success: true, transaction })
        } else {
          results.push({ success: false, transaction, error: 'Server error' })
        }
      } catch (error) {
        results.push({ success: false, transaction, error: error.message })
      }
    }
    
    return results
  } catch (error) {
    console.error('Failed to sync pending transactions:', error)
    return []
  }
}

const removePendingTransaction = async (id) => {
  try {
    const db = await initOfflineDB()
    const tx = db.transaction(['pendingTransactions'], 'readwrite')
    const store = tx.objectStore('pendingTransactions')
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to remove pending transaction:', error)
  }
}

// Cache management
export const cacheData = async (key, data) => {
  try {
    const db = await initOfflineDB()
    const tx = db.transaction(['cachedData'], 'readwrite')
    const store = tx.objectStore('cachedData')
    
    const cacheEntry = {
      key,
      data,
      timestamp: Date.now()
    }
    
    await store.put(cacheEntry)
    return true
  } catch (error) {
    console.error('Failed to cache data:', error)
    return false
  }
}

export const getCachedData = async (key) => {
  try {
    const db = await initOfflineDB()
    const tx = db.transaction(['cachedData'], 'readonly')
    const store = tx.objectStore('cachedData')
    
    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          // Check if cache is still valid (24 hours)
          const isValid = Date.now() - result.timestamp < 24 * 60 * 60 * 1000
          resolve(isValid ? result.data : null)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to get cached data:', error)
    return null
  }
}

// Install prompt
export const showInstallPrompt = () => {
  let deferredPrompt = null
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    
    // Show custom install button
    const installButton = document.getElementById('install-button')
    if (installButton) {
      installButton.style.display = 'block'
      installButton.addEventListener('click', () => {
        deferredPrompt.prompt()
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt')
          }
          deferredPrompt = null
          installButton.style.display = 'none'
        })
      })
    }
  })
}