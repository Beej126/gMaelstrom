import React, { createContext, useContext, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline, StyledEngineProvider, GlobalStyles} from '@mui/material';
import { useSettings } from './ctxSettings';

// Interface for font size settings based on density
interface FontSizeSettings {
  primary: string;
  secondary: string;
  caption: string;
  chip: string;
}

declare module '@mui/material/styles' {
  interface Theme {
    customProps: {
      density: DensityMode;
      fontSize: FontSizeSettings;
      fontWeight: FontWeightSettings;
    }
  }
  interface ThemeOptions {
    customProps?: {
      density?: DensityMode;
      fontSize?: FontSizeSettings;
      fontWeight?: FontWeightSettings;
    }
  }
}

type DensityMode = 'sparse' | 'condensed';

// Interface for font size settings based on density
interface FontSizeSettings {
  primary: string;
  secondary: string;
  caption: string;
  chip: string;
}

// Interface for font weight settings for different elements
interface FontWeightSettings {
  regular: number;
  medium: number;
  bold: number;
  emailListFrom: number;
  emailListSubject: number;
}

interface ThemeContextType {
  fontSize: FontSizeSettings;
  fontWeight: FontWeightSettings;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Define font size settings for each density mode
const FONT_SIZES = {
  sparse: {
    primary: '0.875rem',    // body2 default size
    secondary: '0.875rem',  // body2 default size
    caption: '0.75rem',     // For smaller text elements
    chip: '0.75rem',        // For chip labels
  },
  condensed: {
    primary: '0.9rem',     // caption default size
    secondary: '0.75rem',   // caption default size
    caption: '0.65rem',     // For smaller text elements
    chip: '0.65rem',        // For chip labels
  }
};

// Define default font weight settings
const DEFAULT_FONT_WEIGHTS: FontWeightSettings = {
  regular: 400,
  medium: 500,
  bold: 700,
  emailListFrom: 700,    // Bold by default for unread emails
  emailListSubject: 700, // Bold by default for unread emails
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {

  const settings = useSettings();

  const fontWeight = DEFAULT_FONT_WEIGHTS;
  const fontSize = FONT_SIZES[settings.density];

  // Update localStorage when dark mode changes
  useEffect(() => {
    document.documentElement.style.setProperty('--email-list-container-bg', settings.darkMode ? '#121212' : '#f5f5f5');
    document.documentElement.style.setProperty('--email-header-bg', settings.darkMode ? '#1e1e1e' : '#ffffff');
    document.documentElement.style.setProperty('--border-color', settings.darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)');
    document.documentElement.style.setProperty('--email-list-container-a', settings.darkMode ? '#afafff' : null);
  }, [settings.darkMode]);


  // Create theme based on current mode and density
  const theme = createTheme({
    palette: {
      mode: settings.darkMode ? 'dark' : 'light',
      ...(settings.darkMode
        ? {
          // Dark mode colors
          primary: {
            main: '#2196f3',
          },
          secondary: {
            main: '#f50057',
          },
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
        }
        : {
          // Light mode colors
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
          background: {
            default: '#ffffff',
            paper: '#ffffff',
          },
        }
      ),
    },
    //roboto is the default for MUI, keeping in case ever want to change
    // typography: {
    //   fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    // },
    components: {
      MuiButtonBase: {
        styleOverrides: {
          root: {
            paddingTop: 2,
            paddingBottom: 2,
            minHeight: 0,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
      MuiTooltip: {
        defaultProps: {
          PopperProps: {
            modifiers: [
              {
                name: 'offset',
                options: {
                  offset: [0, -16], // Move up by ~1em (16px)
                },
              },
            ],
          },
        },
      },
    },
    // Custom properties that can be accessed via theme.customProps
    customProps: {
      density: settings.density,
      fontSize,
      fontWeight,
    },
  });

  // Add global CSS override for MuiButtonBase-root to force minimal padding
  const globalStyles = (
    <GlobalStyles
      styles={{
        '.MuiMenuItem-root': {
          minHeight: '0 !important',
          paddingTop: '2px !important',
          paddingBottom: '2px !important',
          lineHeight: '1.2 !important',
        },
        // Only apply compactness to direct children of .MuiList-root (menu items), not to switches
        '.MuiList-root > .MuiButtonBase-root:not(.MuiSwitch-switchBase)': {
          paddingTop: '2px !important',
          paddingBottom: '2px !important',
          minHeight: '0 !important',
          lineHeight: '1.2 !important',
        },
        '.MuiDivider-root': {
          marginTop: 0,
        },
      }}
    />
  );

  return (
    <ThemeContext.Provider value={{
      fontSize,
      fontWeight
    }}>
      <StyledEngineProvider injectFirst>
        <MuiThemeProvider theme={theme}>
          <CssBaseline />
          {globalStyles}
          {children}
        </MuiThemeProvider>
      </StyledEngineProvider>
    </ThemeContext.Provider>
  );
};