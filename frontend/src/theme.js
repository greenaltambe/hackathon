import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'teal',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily: 'Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '700',
  },
  defaultRadius: 'md',
  colors: {
    // Custom tailored teal brand palette
    teal: [
      '#f0fdfa', // 0
      '#ccfbf1', // 1
      '#99f6e4', // 2
      '#5eead4', // 3
      '#2dd4bf', // 4
      '#14b8a6', // 5
      '#0d9488', // 6 - primary
      '#0f766e', // 7
      '#115e59', // 8
      '#134e4a', // 9
    ],
  },
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
  },
  components: {
    Card: {
      defaultProps: {
        bg: '#ffffff',
        withBorder: true,
        shadow: 'xs',
      },
    },
    Paper: {
      defaultProps: {
        bg: '#ffffff',
        withBorder: true,
        shadow: 'xs',
      },
    },
    Button: {
      defaultProps: {
        size: 'sm',
      },
    },
    Badge: {
      defaultProps: {
        size: 'md',
        radius: 'sm',
      },
    },
  },
});

export default theme;
