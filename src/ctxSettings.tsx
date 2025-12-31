
import { useMediaQuery } from '@mui/material';
import React, { createContext, useContext } from 'react';
import { EnumValue, makeStringEnum } from './helpers/typeHelpers';
import { useStorageState } from './helpers/useStorageState';

type DensityMode = 'sparse' | 'condensed';

interface SettingsContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;

  density: DensityMode;
  setDensity: (density: DensityMode) => void;

  combineThreads: boolean;
  setCombineThreads: (combine: boolean) => void;

  labelVisibility: Record<string, boolean>;
  setLabelVisibility: (visibility: Record<string, boolean>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};

export const STORAGE_KEY_PREFIX = "gMaelstrom_";
export const SettingName = makeStringEnum([...['EMAIL_LIST_DENSITY', 'DARK_MODE', 'COMBINE_THREADS', 'LABEL_VISIBILITY'] as const].map(s => STORAGE_KEY_PREFIX + s));
export type SettingNameType = EnumValue<typeof SettingName>;


export const SettingsProvider: React.FC<{ children: React.ReactNode }> = props => {

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useStorageState<boolean, SettingNameType>(SettingName.DARK_MODE, prefersDarkMode);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const [density, setDensity] = useStorageState<DensityMode, SettingNameType>(SettingName.EMAIL_LIST_DENSITY, "sparse");
  const [combineThreads, setCombineThreads] = useStorageState<boolean, SettingNameType>(SettingName.COMBINE_THREADS, true);
  const [labelVisibility, setLabelVisibility] = useStorageState<Record<string, boolean>, SettingNameType>(SettingName.LABEL_VISIBILITY, {});

  return (
    <SettingsContext.Provider value={{
      darkMode,
      toggleDarkMode,

      density,
      setDensity,

      combineThreads,
      setCombineThreads,

      labelVisibility,
      setLabelVisibility,
    }}>
      {props.children}
    </SettingsContext.Provider>
  );

};