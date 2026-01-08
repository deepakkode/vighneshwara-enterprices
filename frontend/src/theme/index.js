import { createTheme } from '@mui/material/styles'

// Vighneshwara Enterprises brand colors
const colors = {
  primary: {
    main: '#E53E3E', // Company red
    light: '#FC8181',
    dark: '#C53030',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#3182CE', // Company blue
    light: '#63B3ED',
    dark: '#2C5282',
    contrastText: '#FFFFFF'
  },
  success: {
    main: '#38A169', // Company green
    light: '#68D391',
    dark: '#2F855A',
    contrastText: '#FFFFFF'
  },
  error: {
    main: '#E53E3E',
    light: '#FC8181',
    dark: '#C53030'
  },
  warning: {
    main: '#D69E2E',
    light: '#F6E05E',
    dark: '#B7791F'
  },
  info: {
    main: '#3182CE',
    light: '#63B3ED',
    dark: '#2C5282'
  }
}

// Create theme with dark/light mode support
export const createAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark'
  
  return createTheme({
    palette: {
      mode,
      ...colors,
      background: {
        default: isDark ? '#0F0F23' : '#F7FAFC',
        paper: isDark ? '#1A1B3A' : '#FFFFFF'
      },
      text: {
        primary: isDark ? '#E2E8F0' : '#1A202C',
        secondary: isDark ? '#A0AEC0' : '#4A5568'
      },
      divider: isDark ? '#2D3748' : '#E2E8F0'
    },
    typography: {
      fontFamily: '"Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.025em'
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.025em'
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.02em'
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.02em'
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.01em'
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.01em'
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
        letterSpacing: '0.00938em'
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
        letterSpacing: '0.01071em'
      },
      button: {
        fontWeight: 600,
        textTransform: 'none',
        letterSpacing: '0.02em'
      }
    },
    shape: {
      borderRadius: 12
    },
    shadows: isDark ? [
      'none',
      '0px 1px 3px rgba(0, 0, 0, 0.4)',
      '0px 1px 5px rgba(0, 0, 0, 0.4)',
      '0px 1px 8px rgba(0, 0, 0, 0.4)',
      '0px 1px 10px rgba(0, 0, 0, 0.4)',
      '0px 1px 14px rgba(0, 0, 0, 0.4)',
      '0px 1px 18px rgba(0, 0, 0, 0.4)',
      '0px 2px 16px rgba(0, 0, 0, 0.4)',
      '0px 3px 14px rgba(0, 0, 0, 0.4)',
      '0px 3px 16px rgba(0, 0, 0, 0.4)',
      '0px 4px 18px rgba(0, 0, 0, 0.4)',
      '0px 4px 20px rgba(0, 0, 0, 0.4)',
      '0px 5px 22px rgba(0, 0, 0, 0.4)',
      '0px 5px 24px rgba(0, 0, 0, 0.4)',
      '0px 5px 26px rgba(0, 0, 0, 0.4)',
      '0px 6px 28px rgba(0, 0, 0, 0.4)',
      '0px 6px 30px rgba(0, 0, 0, 0.4)',
      '0px 6px 32px rgba(0, 0, 0, 0.4)',
      '0px 7px 34px rgba(0, 0, 0, 0.4)',
      '0px 7px 36px rgba(0, 0, 0, 0.4)',
      '0px 8px 38px rgba(0, 0, 0, 0.4)',
      '0px 8px 40px rgba(0, 0, 0, 0.4)',
      '0px 8px 42px rgba(0, 0, 0, 0.4)',
      '0px 9px 44px rgba(0, 0, 0, 0.4)',
      '0px 9px 46px rgba(0, 0, 0, 0.4)'
    ] : [
      'none',
      '0px 1px 3px rgba(0, 0, 0, 0.12), 0px 1px 2px rgba(0, 0, 0, 0.24)',
      '0px 3px 6px rgba(0, 0, 0, 0.16), 0px 3px 6px rgba(0, 0, 0, 0.23)',
      '0px 10px 20px rgba(0, 0, 0, 0.19), 0px 6px 6px rgba(0, 0, 0, 0.23)',
      '0px 14px 28px rgba(0, 0, 0, 0.25), 0px 10px 10px rgba(0, 0, 0, 0.22)',
      '0px 19px 38px rgba(0, 0, 0, 0.30), 0px 15px 12px rgba(0, 0, 0, 0.22)',
      ...Array(19).fill('0px 19px 38px rgba(0, 0, 0, 0.30), 0px 15px 12px rgba(0, 0, 0, 0.22)')
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? '#4A5568 #2D3748' : '#CBD5E0 #EDF2F7',
            '&::-webkit-scrollbar': {
              width: '8px'
            },
            '&::-webkit-scrollbar-track': {
              background: isDark ? '#2D3748' : '#EDF2F7'
            },
            '&::-webkit-scrollbar-thumb': {
              background: isDark ? '#4A5568' : '#CBD5E0',
              borderRadius: '4px',
              '&:hover': {
                background: isDark ? '#718096' : '#A0AEC0'
              }
            }
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: isDark 
                ? '0px 8px 25px rgba(0, 0, 0, 0.6)' 
                : '0px 8px 25px rgba(0, 0, 0, 0.15)'
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)'
            }
          },
          contained: {
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)'
            }
          }
        }
      },
      MuiFab: {
        styleOverrides: {
          root: {
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: '0px 8px 25px rgba(0, 0, 0, 0.25)'
            }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: 'none',
            backdropFilter: 'blur(20px)'
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              transition: 'all 0.2s ease-in-out',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: colors.primary.main
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderWidth: '2px'
              }
            }
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(20px)',
            backgroundColor: isDark 
              ? 'rgba(26, 27, 58, 0.8)' 
              : 'rgba(255, 255, 255, 0.8)',
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)'
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(10px)',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
          }
        }
      }
    }
  })
}

// Default light theme
export const theme = createAppTheme('light')

export default theme