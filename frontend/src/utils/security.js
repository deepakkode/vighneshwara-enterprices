// Frontend security utilities

// XSS protection
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Input validation
export const validateInput = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },
  
  phone: (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/
    return phoneRegex.test(phone.replace(/\D/g, ''))
  },
  
  number: (num) => {
    return !isNaN(num) && isFinite(num)
  },
  
  currency: (amount) => {
    const currencyRegex = /^\d+(\.\d{1,2})?$/
    return currencyRegex.test(amount.toString())
  },
  
  alphanumeric: (str) => {
    const alphanumericRegex = /^[a-zA-Z0-9\s]+$/
    return alphanumericRegex.test(str)
  },
  
  length: (str, min = 0, max = Infinity) => {
    return str.length >= min && str.length <= max
  }
}

// Content Security Policy helpers
export const CSP = {
  // Check if inline scripts are allowed
  allowsInlineScripts: () => {
    try {
      eval('1')
      return true
    } catch (e) {
      return false
    }
  },
  
  // Report CSP violations
  reportViolation: (violation) => {
    console.warn('CSP Violation:', violation)
    
    // Send to analytics if available
    if (window.gtag) {
      window.gtag('event', 'csp_violation', {
        blocked_uri: violation.blockedURI,
        violated_directive: violation.violatedDirective
      })
    }
  }
}

// Secure storage utilities
export const secureStorage = {
  // Encrypt data before storing (simple XOR encryption for demo)
  encrypt: (data, key = 'vighneshwara-key') => {
    const jsonString = JSON.stringify(data)
    let encrypted = ''
    
    for (let i = 0; i < jsonString.length; i++) {
      encrypted += String.fromCharCode(
        jsonString.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      )
    }
    
    return btoa(encrypted)
  },
  
  // Decrypt stored data
  decrypt: (encryptedData, key = 'vighneshwara-key') => {
    try {
      const encrypted = atob(encryptedData)
      let decrypted = ''
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        )
      }
      
      return JSON.parse(decrypted)
    } catch (error) {
      console.error('Decryption failed:', error)
      return null
    }
  },
  
  // Store encrypted data
  setItem: (key, data) => {
    try {
      const encrypted = secureStorage.encrypt(data)
      localStorage.setItem(key, encrypted)
      return true
    } catch (error) {
      console.error('Secure storage failed:', error)
      return false
    }
  },
  
  // Get and decrypt data
  getItem: (key) => {
    try {
      const encrypted = localStorage.getItem(key)
      if (!encrypted) return null
      
      return secureStorage.decrypt(encrypted)
    } catch (error) {
      console.error('Secure retrieval failed:', error)
      return null
    }
  },
  
  // Remove item
  removeItem: (key) => {
    localStorage.removeItem(key)
  }
}

// API security helpers
export const apiSecurity = {
  // Add security headers to requests
  addSecurityHeaders: (headers = {}) => {
    return {
      ...headers,
      'X-Requested-With': 'XMLHttpRequest',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    }
  },
  
  // Validate API response
  validateResponse: (response) => {
    // Check for common attack patterns in response
    const responseText = JSON.stringify(response)
    
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /document\.cookie/i
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(responseText)) {
        console.warn('Potentially dangerous content in API response')
        return false
      }
    }
    
    return true
  },
  
  // Rate limiting for client-side requests
  rateLimiter: (() => {
    const requests = new Map()
    
    return (endpoint, limit = 10, window = 60000) => {
      const now = Date.now()
      const key = endpoint
      
      if (!requests.has(key)) {
        requests.set(key, [])
      }
      
      const endpointRequests = requests.get(key)
      
      // Remove old requests outside the window
      const validRequests = endpointRequests.filter(
        timestamp => now - timestamp < window
      )
      
      if (validRequests.length >= limit) {
        console.warn(`Rate limit exceeded for ${endpoint}`)
        return false
      }
      
      validRequests.push(now)
      requests.set(key, validRequests)
      
      return true
    }
  })()
}

// Form security
export const formSecurity = {
  // Generate CSRF token
  generateCSRFToken: () => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  },
  
  // Validate form data
  validateFormData: (formData, rules) => {
    const errors = {}
    
    for (const [field, value] of Object.entries(formData)) {
      const fieldRules = rules[field]
      if (!fieldRules) continue
      
      // Required validation
      if (fieldRules.required && (!value || value.toString().trim() === '')) {
        errors[field] = `${field} is required`
        continue
      }
      
      // Type validation
      if (value && fieldRules.type) {
        switch (fieldRules.type) {
          case 'email':
            if (!validateInput.email(value)) {
              errors[field] = 'Invalid email format'
            }
            break
          case 'phone':
            if (!validateInput.phone(value)) {
              errors[field] = 'Invalid phone number'
            }
            break
          case 'number':
            if (!validateInput.number(value)) {
              errors[field] = 'Must be a valid number'
            }
            break
          case 'currency':
            if (!validateInput.currency(value)) {
              errors[field] = 'Invalid currency format'
            }
            break
        }
      }
      
      // Length validation
      if (value && fieldRules.minLength && value.toString().length < fieldRules.minLength) {
        errors[field] = `Minimum length is ${fieldRules.minLength}`
      }
      
      if (value && fieldRules.maxLength && value.toString().length > fieldRules.maxLength) {
        errors[field] = `Maximum length is ${fieldRules.maxLength}`
      }
      
      // Custom validation
      if (value && fieldRules.validate && !fieldRules.validate(value)) {
        errors[field] = fieldRules.message || 'Invalid value'
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }
}

// Initialize security features
export const initSecurity = () => {
  // Listen for CSP violations
  document.addEventListener('securitypolicyviolation', (e) => {
    CSP.reportViolation(e)
  })
  
  // Prevent right-click in production
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault()
    })
    
    // Prevent F12, Ctrl+Shift+I, etc.
    document.addEventListener('keydown', (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault()
      }
    })
  }
  
  // Clear sensitive data on page unload
  window.addEventListener('beforeunload', () => {
    // Clear any sensitive data from memory
    if (window.sensitiveData) {
      window.sensitiveData = null
    }
  })
}

// Initialize security on load
if (typeof window !== 'undefined') {
  initSecurity()
}