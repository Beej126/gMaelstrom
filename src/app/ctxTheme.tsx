import React, { createContext, useState, useContext, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline, StyledEngineProvider, GlobalStyles, useMediaQuery } from '@mui/material';

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

type ThemeMode = 'light' | 'dark';
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
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  density: DensityMode;
  setDensity: (density: DensityMode) => void;
  fontSize: FontSizeSettings;
  fontWeight: FontWeightSettings;
  setEmailListFontWeight: (type: 'from' | 'subject', value: number) => void;
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
  // Call useMediaQuery at the top level
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Check if user has a preference stored in local storage
  const getInitialMode = (): ThemeMode => {
    const savedMode = localStorage.getItem('gMaelstrom_themeMode');
    if (savedMode === 'light' || savedMode === 'dark') {
      return savedMode;
    }
    // Use the already-evaluated prefersDarkMode value
    return prefersDarkMode ? 'dark' : 'light';
  };
  
  const getInitialDensity = (): DensityMode => {
    const savedDensity = localStorage.getItem('gMaelstrom_densityMode');
    if (savedDensity === 'sparse' || savedDensity === 'condensed') {
      return savedDensity;
    }
    // Default to sparse
    return 'sparse';
  };

  // Get initial font weight settings from local storage
  const getInitialFontWeights = (): FontWeightSettings => {
    try {
      const savedFontWeights = localStorage.getItem('gMaelstrom_fontWeights');
      if (savedFontWeights) {
        return { ...DEFAULT_FONT_WEIGHTS, ...JSON.parse(savedFontWeights) };
      }
    } catch (error) {
      console.error('Error parsing font weight settings', error);
    }
    return DEFAULT_FONT_WEIGHTS;
  };

  const [mode, setMode] = useState<ThemeMode>(getInitialMode);
  const [density, setDensity] = useState<DensityMode>(getInitialDensity);
  const [fontWeight, setFontWeight] = useState<FontWeightSettings>(getInitialFontWeights);
  
  // Get current font size settings based on density
  const fontSize = FONT_SIZES[density];

  // Update localStorage when mode changes
  useEffect(() => {
    localStorage.setItem('gMaelstrom_themeMode', mode);
    // Also set CSS variables for components that use MainLayout.css
    if (mode === 'dark') {
      document.documentElement.style.setProperty('--email-content-bg', '#121212');
      document.documentElement.style.setProperty('--email-header-bg', '#1e1e1e');
      document.documentElement.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.12)');
      document.documentElement.style.setProperty('--email-content-a', '#afafff');
    } else {
      document.documentElement.style.setProperty('--email-content-bg', '#f5f5f5');
      document.documentElement.style.setProperty('--email-header-bg', '#ffffff');
      document.documentElement.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.12)');
    }
  }, [mode]);
  
  // Update localStorage when density changes
  useEffect(() => {
    localStorage.setItem('gMaelstrom_densityMode', density);
  }, [density]);

  // Update localStorage when font weights change
  useEffect(() => {
    localStorage.setItem('gMaelstrom_fontWeights', JSON.stringify(fontWeight));
  }, [fontWeight]);

  // Toggle between light and dark mode
  const toggleTheme = () => {
    setMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Update emailList font weights
  const setEmailListFontWeight = (type: 'from' | 'subject', value: number) => {
    setFontWeight(prev => ({
      ...prev,
      [`emailList${type.charAt(0).toUpperCase() + type.slice(1)}`]: value
    }));
  };

  // Create theme based on current mode and density
  const theme = createTheme({
    palette: {
      mode,
      ...(mode === 'dark' 
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
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
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
      density,
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
      mode, 
      toggleTheme, 
      setMode, 
      density, 
      setDensity, 
      fontSize,
      fontWeight,
      setEmailListFontWeight
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