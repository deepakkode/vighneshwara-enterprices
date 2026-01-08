export const colors = {
  // VES Logo Color Palette - More Professional
  primary: '#2C3E50', // Dark blue-gray (professional)
  secondary: '#4DB6AC', // Teal/Green from logo  
  accent: '#3F51B5', // Blue from logo
  gradient: {
    pink: '#E91E63',
    coral: '#FF6B9D',
    teal: '#4DB6AC',
    blue: '#3F51B5',
    purple: '#9C27B0'
  },
  
  // UI Colors
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  border: '#E0E0E0',
  shadow: '#000000',
  
  // Card backgrounds with subtle gradients
  cardPink: '#FCE4EC',
  cardTeal: '#E0F2F1',
  cardBlue: '#E8EAF6',
  cardPurple: '#F3E5F5',
};

export const theme = {
  colors: {
    ...colors,
    primary: colors.primary,
    accent: colors.accent,
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
    disabled: '#CCCCCC',
    placeholder: colors.textSecondary,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    onSurface: colors.text,
    notification: colors.error,
  },
  roundness: 8,
};