import React from 'react'

// Performance optimization utilities for React frontend

// Lazy loading helper
export const lazyLoad = (importFunc, fallback = null) => {
  const LazyComponent = React.lazy(importFunc)
  
  return (props) => React.createElement(
    React.Suspense,
    { fallback },
    React.createElement(LazyComponent, props)
  )
}

// Image optimization
export const optimizeImage = (src, options = {}) => {
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    fallback = 'jpg'
  } = options
  
  // Check if browser supports WebP
  const supportsWebP = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }
  
  const actualFormat = supportsWebP() ? format : fallback
  const params = new URLSearchParams()
  
  if (width) params.append('w', width)
  if (height) params.append('h', height)
  if (quality) params.append('q', quality)
  if (actualFormat) params.append('f', actualFormat)
  
  return `${src}?${params.toString()}`
}

// Debounce utility for search and input handling
export const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

// Throttle utility for scroll and resize events
export const throttle = (func, limit) => {
  let inThrottle
  return (...args) => {
    if (!inThrottle) {
      func.apply(null, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Virtual scrolling helper for large lists
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = React.useState(0)
  
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length)
  
  const visibleItems = items.slice(startIndex, endIndex)
  const offsetY = startIndex * itemHeight
  
  return {
    visibleItems,
    offsetY,
    totalHeight: items.length * itemHeight,
    onScroll: (e) => setScrollTop(e.target.scrollTop)
  }
}

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false)
  const [hasIntersected, setHasIntersected] = React.useState(false)
  const elementRef = React.useRef()
  
  React.useEffect(() => {
    const element = elementRef.current
    if (!element) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )
    
    observer.observe(element)
    
    return () => observer.disconnect()
  }, [hasIntersected, options])
  
  return { elementRef, isIntersecting, hasIntersected }
}

// Performance monitoring
export const performanceMonitor = {
  // Measure component render time
  measureRender: (componentName) => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      if (renderTime > 16) { // > 16ms (60fps threshold)
        console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`)
      }
      
      // Send to analytics if available
      if (window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: `render_${componentName}`,
          value: Math.round(renderTime)
        })
      }
    }
  },
  
  // Measure API call performance
  measureAPI: (endpoint) => {
    const startTime = performance.now()
    
    return (success = true) => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`API ${endpoint}: ${duration.toFixed(2)}ms (${success ? 'success' : 'error'})`)
      
      // Send to analytics
      if (window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: `api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
          value: Math.round(duration)
        })
      }
    }
  },
  
  // Monitor memory usage
  checkMemory: () => {
    if ('memory' in performance) {
      const memory = performance.memory
      const used = Math.round(memory.usedJSHeapSize / 1048576) // MB
      const total = Math.round(memory.totalJSHeapSize / 1048576) // MB
      
      console.log(`Memory usage: ${used}MB / ${total}MB`)
      
      if (used > 100) { // > 100MB
        console.warn('High memory usage detected')
      }
      
      return { used, total, percentage: (used / total) * 100 }
    }
    return null
  }
}

// Bundle size optimization helpers
export const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export const loadCSS = (href) => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = resolve
    link.onerror = reject
    document.head.appendChild(link)
  })
}

// Preload critical resources
export const preloadResource = (href, as = 'script') => {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  link.as = as
  document.head.appendChild(link)
}

// Service Worker utilities
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            if (confirm('New version available! Reload to update?')) {
              window.location.reload()
            }
          }
        })
      })
      
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }
}

// Cache management
export const cacheManager = {
  // Cache API responses
  cacheResponse: async (key, data, ttl = 300000) => { // 5 minutes default
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl
    }
    
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to cache data:', error)
    }
  },
  
  // Get cached response
  getCachedResponse: (key) => {
    try {
      const cached = localStorage.getItem(`cache_${key}`)
      if (!cached) return null
      
      const { data, timestamp, ttl } = JSON.parse(cached)
      
      if (Date.now() - timestamp > ttl) {
        localStorage.removeItem(`cache_${key}`)
        return null
      }
      
      return data
    } catch (error) {
      console.warn('Failed to get cached data:', error)
      return null
    }
  },
  
  // Clear expired cache
  clearExpiredCache: () => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'))
    
    keys.forEach(key => {
      try {
        const cached = JSON.parse(localStorage.getItem(key))
        if (Date.now() - cached.timestamp > cached.ttl) {
          localStorage.removeItem(key)
        }
      } catch (error) {
        localStorage.removeItem(key) // Remove invalid cache entries
      }
    })
  }
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Clear expired cache on load
  cacheManager.clearExpiredCache()
  
  // Monitor memory usage periodically
  setInterval(() => {
    performanceMonitor.checkMemory()
  }, 30000) // Every 30 seconds
  
  // Register service worker
  registerServiceWorker()
}