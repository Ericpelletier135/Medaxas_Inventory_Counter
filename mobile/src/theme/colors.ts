// Translated from Medaxas Inventory Counter web globals.css (CSS variables)
export const colors = {
  primary: '#0046B6',
  primaryHover: '#003A96',
  background: '#FCFCFC',
  surface: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  
  // Semantic Colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: '#E5E7EB',
};

// Common shadows using React Native elevation (Android) and shadow props (iOS)
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
};

// Common radiuses
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
};
