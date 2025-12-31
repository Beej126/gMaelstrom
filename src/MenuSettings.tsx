import React, { useState } from 'react';
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
  Radio,
  Tooltip,
  IconButton
} from '@mui/material';
import ViewComfyIcon from '@mui/icons-material/ViewComfy';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ForumIcon from '@mui/icons-material/Forum';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import WarningIcon from '@mui/icons-material/Warning';
import LabelSettingsDialog from './LabelSettingsDialog';
import SettingsIcon from '@mui/icons-material/Settings';
import { toast } from 'react-toastify';
import { useSettings } from './ctxSettings';


const SettingsMenu: React.FC = _ => {

  const settings = useSettings();
  const [labelSettingsOpen, setLabelSettingsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const onOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const onClose = () => {
    setAnchorEl(null);
  };

    // Theme toggle separately from menu item click
  const onToggleDarkMode = () => {
    onClose();
    settings.toggleDarkMode();
  };

  const onDensityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onClose();
    settings.setDensity(event.target.value as 'sparse' | 'condensed');
  };

  const onCombineThreadsChange = () => {
    onClose();
    settings.setCombineThreads(!settings.combineThreads);
  };

  const onUnignoreAllWarnings = () => {
    onClose();

    // List of all localStorage keys for ignored warnings
    const warningKeys = [
      'gMaelstrom_ignoreHostWarning',
      // Add more warning keys here as they are implemented
    ];

    // Remove all ignored warning preferences
    warningKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    // Show confirmation toast
    toast.success('All warning preferences have been reset. Warnings will now appear again when applicable.', {
      autoClose: 4000,
    });

    // Close the settings menu
    onClose();
  };


  return <>

    <Tooltip title="Settings">
      <IconButton
        size="large"
        onClick={onOpen}
        aria-controls="settings-menu"
        aria-haspopup="true"
      >
        <SettingsIcon />
      </IconButton>
    </Tooltip>

    <LabelSettingsDialog open={labelSettingsOpen} onClose={() => setLabelSettingsOpen(false)} />

    <Menu
      id="settings-menu"
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
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
        onClick={onToggleDarkMode} // it seems nice to have the whole menu item clickable versus needing to click the toggle widget specifically
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}
      >
        <Box display="flex" alignItems="center">
          <ListItemIcon>
            {settings.darkMode ? <DarkModeIcon color="primary" /> : <LightModeIcon color="primary" />}
          </ListItemIcon>
          <ListItemText>{settings.darkMode ? 'Dark Mode' : 'Light Mode'}</ListItemText>
        </Box>
        <Switch checked={settings.darkMode} onChange={onToggleDarkMode}  />
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
          value={settings.density}
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
        onClick={onCombineThreadsChange}
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}
      >
        <Box display="flex" alignItems="center">
          <ListItemIcon>
            <ForumIcon color="primary" />
          </ListItemIcon>
          <ListItemText>Combine Threads</ListItemText>
        </Box>
        <Switch checked={settings.combineThreads} onChange={onCombineThreadsChange} onClick={e => e.stopPropagation()} />
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
  </>;
};

export default SettingsMenu;
