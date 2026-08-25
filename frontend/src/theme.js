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
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
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
      styles: {
        root: {
          fontWeight: 600,
          transition: 'all 0.15s ease',
        },
      },
    },
    Badge: {
      defaultProps: {
        size: 'md',
        radius: 'sm',
      },
      styles: {
        root: {
          fontWeight: 600,
          letterSpacing: '0.01em',
        },
      },
    },
    TextInput: {
      defaultProps: {
        size: 'sm',
      },
      styles: {
        input: {
          borderColor: '#e2e8f0',
          backgroundColor: '#ffffff',
          '&:focus': {
            borderColor: '#0d9488',
          },
        },
      },
    },
    Select: {
      defaultProps: {
        size: 'sm',
      },
      styles: {
        input: {
          borderColor: '#e2e8f0',
          backgroundColor: '#ffffff',
          '&:focus': {
            borderColor: '#0d9488',
          },
        },
      },
    },
    Table: {
      styles: {
        th: {
          color: '#475569',
          fontWeight: 600,
          fontSize: '12.5px',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        },
        td: {
          fontSize: '13.5px',
        },
      },
    },
  },
});

export default theme;
