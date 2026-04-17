
import { useMediaQuery } from '@mui/material';
import React, { createContext, useContext } from 'react';
import { EnumValue, makeStringEnum } from '../helpers/typeHelpers';
import { useLocalStorageState } from '../helpers/useStorageState';

type DensityMode = 'sparse' | 'condensed';
export type ThreadListAutoSizeField = 'from' | 'subject' | 'date' | 'labels';
export type ThreadListColumnWidths = Partial<Record<ThreadListAutoSizeField, number>>;

interface SettingsContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;

  density: DensityMode;
  setDensity: (density: DensityMode) => void;

  listFontWeight: number;
  setListFontWeight: (fontWeight: number) => void;

  listFontOpacity: number;
  setListFontOpacity: (opacity: number) => void;

  threadListAutoSizeField: ThreadListAutoSizeField;
  setThreadListAutoSizeField: (field: ThreadListAutoSizeField) => void;

  threadListColumnWidths: ThreadListColumnWidths;
  setThreadListColumnWidths: (widths: ThreadListColumnWidths) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};

export const SettingName = makeStringEnum([...['EMAIL_LIST_DENSITY', 'LIST_FONT_WEIGHT', 'LIST_FONT_OPACITY', 'DARK_MODE', 'SYSTEM_LABEL_VISIBILITY', 'LABEL_ORDER', 'THREAD_LIST_AUTO_SIZE_FIELD', 'THREAD_LIST_COLUMN_WIDTHS'] as const]);
export type SettingNameType = EnumValue<typeof SettingName>;


export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useLocalStorageState<boolean, SettingNameType>(SettingName.DARK_MODE, prefersDarkMode);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const [density, setDensity] = useLocalStorageState<DensityMode, SettingNameType>(SettingName.EMAIL_LIST_DENSITY, "sparse");
  const [listFontWeight, setListFontWeight] = useLocalStorageState<number, SettingNameType>(SettingName.LIST_FONT_WEIGHT, 200);
  const [listFontOpacity, setListFontOpacity] = useLocalStorageState<number, SettingNameType>(SettingName.LIST_FONT_OPACITY, 1);
  const [threadListAutoSizeField, setThreadListAutoSizeField] = useLocalStorageState<ThreadListAutoSizeField, SettingNameType>(SettingName.THREAD_LIST_AUTO_SIZE_FIELD, 'subject');
  const [threadListColumnWidths, setThreadListColumnWidths] = useLocalStorageState<ThreadListColumnWidths, SettingNameType>(SettingName.THREAD_LIST_COLUMN_WIDTHS, {});

  return (
    <SettingsContext.Provider value={{
      darkMode,
      toggleDarkMode,

      density,
      setDensity,

      listFontWeight,
      setListFontWeight,

      listFontOpacity,
      setListFontOpacity,

      threadListAutoSizeField,
      setThreadListAutoSizeField,

      threadListColumnWidths,
      setThreadListColumnWidths,
  }}>
      {children}
    </SettingsContext.Provider>
  );

};