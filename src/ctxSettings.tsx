
import { useMediaQuery } from '@mui/material';
import React, { createContext, useContext } from 'react';
import { EnumValue, makeStringEnum } from './helpers/typeHelpers';
import { useLocalStorageState } from './helpers/useStorageState';

type DensityMode = 'sparse' | 'condensed';

interface SettingsContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;

  density: DensityMode;
  setDensity: (density: DensityMode) => void;

  combineThreads: boolean;
  setCombineThreads: (combine: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};

export const SettingName = makeStringEnum([...['EMAIL_LIST_DENSITY', 'DARK_MODE', 'COMBINE_THREADS', 'LABEL_ORDER'] as const]);
export type SettingNameType = EnumValue<typeof SettingName>;


export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useLocalStorageState<boolean, SettingNameType>(SettingName.DARK_MODE, prefersDarkMode);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const [density, setDensity] = useLocalStorageState<DensityMode, SettingNameType>(SettingName.EMAIL_LIST_DENSITY, "sparse");
  const [combineThreads, setCombineThreads] = useLocalStorageState<boolean, SettingNameType>(SettingName.COMBINE_THREADS, true);

  return (
    <SettingsContext.Provider value={{
      darkMode,
      toggleDarkMode,

      density,
      setDensity,

      combineThreads,
      setCombineThreads,
  }}>
      {children}
    </SettingsContext.Provider>
  );

};