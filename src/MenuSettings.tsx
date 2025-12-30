import React from 'react';
import {
  Menu,
  MenuItem,
  Divider,
  Box,
  Typography,
  ListItemIcon,
  ListItemText,
  Switch,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import ViewComfyIcon from '@mui/icons-material/ViewComfy';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ForumIcon from '@mui/icons-material/Forum';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import WarningIcon from '@mui/icons-material/Warning';
import LabelSettingsDialog from './LabelSettingsDialog';

interface SettingsMenuProps {
  anchorEl: null | HTMLElement;
  open: boolean;
  onClose: () => void;
  mode: 'dark' | 'light';
  toggleTheme: () => void;
  onThemeToggle: (event: React.ChangeEvent<HTMLInputElement>) => void;
  density: 'sparse' | 'condensed';
  setDensity: (density: 'sparse' | 'condensed') => void;
  onDensityChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  combineThreads: boolean;
  setCombineThreads: (combine: boolean) => void;
  onCombineThreadsChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  labelSettingsOpen: boolean;
  setLabelSettingsOpen: (open: boolean) => void;
  onUnignoreAllWarnings: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
  anchorEl,
  open,
  onClose,
  mode,
  toggleTheme,
  onThemeToggle,
  density,
  // setDensity,
  onDensityChange,
  combineThreads,
  setCombineThreads,
  onCombineThreadsChange,
  labelSettingsOpen,
  setLabelSettingsOpen,
  onUnignoreAllWarnings
}) => (
  <Menu
    id="settings-menu"
    anchorEl={anchorEl}
    open={open}
    onClose={onClose}
    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    PaperProps={{ sx: { width: 250 } }}
  >
    <Box px={2} py={1}>
      <Typography variant="subtitle1">Settings</Typography>
    </Box>
    <Divider />
    <MenuItem
      onClick={toggleTheme}
      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}
    >
      <Box display="flex" alignItems="center">
        <ListItemIcon>
          {mode === 'dark' ? <DarkModeIcon color="primary" /> : <LightModeIcon color="primary" />}
        </ListItemIcon>
        <ListItemText>{mode === 'dark' ? 'Dark Mode' : 'Light Mode'}</ListItemText>
      </Box>
      <Switch checked={mode === 'dark'} onChange={onThemeToggle} onClick={e => e.stopPropagation()} />
    </MenuItem>
    <Divider sx={{ my: 0, minHeight: 0 }} />
    <MenuItem sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 0, py: 0, minHeight: 0, height: 'auto', px: 2 }}>
      <Box display="flex" alignItems="center" width="100%" mb={0}>
        <ListItemIcon sx={{ minWidth: 36, alignItems: 'center', mt: 0.5 }}>
          <ViewComfyIcon color="primary" />
        </ListItemIcon>
        <ListItemText primary="Email List Density" />
      </Box>
      <RadioGroup
        aria-label="density"
        name="density"
        value={density}
        onChange={onDensityChange}
        onClick={e => e.stopPropagation()}
        sx={{ width: '100%', flexDirection: 'row', alignItems: 'center', mt: 0.5, mb: 0.5, gap: 1 }}
      >
        <FormControlLabel value="sparse" control={<Radio size="small" sx={{ p: 0.5, alignSelf: 'center' }} />} label={<Typography variant="body2" sx={{ lineHeight: 1.5, alignSelf: 'center', mt: 0.1 }}>Sparse</Typography>} sx={{ ml: 0, mr: 2, py: 0, minHeight: 0, alignItems: 'center' }} />
        <FormControlLabel value="condensed" control={<Radio size="small" sx={{ p: 0.5, alignSelf: 'center' }} />} label={<Typography variant="body2" sx={{ lineHeight: 1.5, alignSelf: 'center', mt: 0.1 }}>Condensed</Typography>} sx={{ ml: 0, mr: 0, py: 0, minHeight: 0, alignItems: 'center' }} />
      </RadioGroup>
    </MenuItem>
    <Divider sx={{ my: 0, minHeight: 0 }} />
    <MenuItem
      onClick={() => setCombineThreads(!combineThreads)}
      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}
    >
      <Box display="flex" alignItems="center">
        <ListItemIcon>
          <ForumIcon color="primary" />
        </ListItemIcon>
        <ListItemText>Combine Threads</ListItemText>
      </Box>
      <Switch checked={combineThreads} onChange={onCombineThreadsChange} onClick={e => e.stopPropagation()} />
    </MenuItem>
    <Divider sx={{ my: 0, minHeight: 0 }} />
    <MenuItem onClick={() => { setLabelSettingsOpen(true); onClose(); }} sx={{ display: 'flex', alignItems: 'center', py: 1.5 }}>
      <ListItemIcon>
        <LabelOutlinedIcon color="primary" />
      </ListItemIcon>
      <ListItemText>Label Settings</ListItemText>
    </MenuItem>
    <LabelSettingsDialog open={labelSettingsOpen} onClose={() => setLabelSettingsOpen(false)} />
    <Divider sx={{ my: 0, minHeight: 0 }} />
    <MenuItem onClick={onUnignoreAllWarnings} sx={{ display: 'flex', alignItems: 'center', py: 1.5 }}>
      <ListItemIcon>
        <WarningIcon color="primary" />
      </ListItemIcon>
      <ListItemText>Un-Ignore All Warnings</ListItemText>
    </MenuItem>
  </Menu>
);

export default SettingsMenu;
