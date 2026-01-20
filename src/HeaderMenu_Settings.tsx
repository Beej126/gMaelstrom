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
import SettingsIcon from '@mui/icons-material/Settings';
import { useSettings } from './services/ctxSettings';
import { toast } from 'react-toastify';
import { useApiDataCache } from './services/ctxApiDataCache';


const SettingsMenu: React.FC = _ => {

  const cache = useApiDataCache();
  const settings = useSettings();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const onToggleOpen = (event: React.MouseEvent<HTMLElement>) => {
    const enabled = anchorEl ? null : event.currentTarget;
    setAnchorEl(enabled);
    cache.setSettingsEditMode(!!enabled);
  };

  const onClose = () => {
    setAnchorEl(null);
    cache.setSettingsEditMode(false);
  };

  // Theme toggle separately from menu item click
  const onToggleDarkMode = () => {
    settings.toggleDarkMode();
    onClose();
  };

  const onDensityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    settings.setDensity(event.target.value as 'sparse' | 'condensed');
    onClose();
  };

  const onCombineThreadsChange = () => {
    settings.setCombineThreads(!settings.combineThreads);
    onClose();
  };

  // const onUnignoreAllWarnings = () => {
  //   onClose();

  //   // List of all localStorage keys for ignored warnings
  //   const warningKeys = [
  //     'gMaelstrom_ignoreHostWarning',
  //     // Add more warning keys here as they are implemented
  //   ];

  //   // Remove all ignored warning preferences
  //   warningKeys.forEach(key => {
  //     localStorage.removeItem(key);
  //   });

  //   // Show confirmation toast
  //   toast.success('All warning preferences have been reset. Warnings will now appear again when applicable.', {
  //     autoClose: 4000,
  //   });
  // };


  return <>

    <Tooltip title="Settings">
      <IconButton
        sx={{
          mx: -0.75,
          // zIndex allows the button to be clickable even when the menu is open
          zIndex: (theme) => theme.zIndex.modal + 1 
        }} 
        size="large"
        onClick={onToggleOpen}
      >
        <SettingsIcon />
      </IconButton>
    </Tooltip>

    <Menu
      // lowering the zIndex down to 1 (theme default 1300) allows the label panel settings to be clickable while the menu is open
      sx={{ zIndex: 1 }}
      disablePortal={true}
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}

      onClose={(_event, reason) => {
        // ignore backdrop clicks; only close via icon toggle or explicit handlers (e.g. ESC key)
        //   this way leaving menu open also becomes an edit mode for the labels side panel (and anything else that comes up like that)
        if ((reason as string) !== 'backdropClick') onClose();
      }}

    >
      <Box px={2} py={1}>
        <Typography variant="subtitle1">Settings</Typography>
      </Box>

      <Divider />

      <MenuItem
        onClick={onToggleDarkMode} // it seems nice to have the whole menu item clickable versus needing to click the toggle widget specifically
        sx={{ justifyContent: 'space-between' }}
      >
        <Box display="flex" alignItems="center">
          <ListItemIcon>
            {settings.darkMode ? <DarkModeIcon color="primary" /> : <LightModeIcon color="primary" />}
          </ListItemIcon>
          <ListItemText>{settings.darkMode ? 'Dark Mode' : 'Light Mode'}</ListItemText>
        </Box>
        <Switch checked={settings.darkMode} onChange={onToggleDarkMode} />
      </MenuItem>

      <Divider sx={{ my: 0, minHeight: 0 }} />

      <MenuItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <Box display="flex"  >
          <ListItemIcon >
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
          sx={{ flexDirection: 'row', mt: 0.75, gap: 1 }}
        >
          <FormControlLabel value="sparse" control={<Radio size="small" sx={{ p: 0.5, alignSelf: 'center' }} />} label={<Typography variant="body2" sx={{ lineHeight: 1.5, alignSelf: 'center', mt: 0.1 }}>Sparse</Typography>} sx={{ ml: 0, mr: 2, py: 0, minHeight: 0, alignItems: 'center' }} />
          <FormControlLabel value="condensed" control={<Radio size="small" sx={{ p: 0.5, alignSelf: 'center' }} />} label={<Typography variant="body2" sx={{ lineHeight: 1.5, alignSelf: 'center', mt: 0.1 }}>Condensed</Typography>} sx={{ ml: 0, mr: 0, py: 0, minHeight: 0, alignItems: 'center' }} />
        </RadioGroup>
      </MenuItem>

      <Divider sx={{ my: 0, minHeight: 0 }} />

      <MenuItem onClick={onCombineThreadsChange}>
        <Box display="flex" alignItems="center">
          <ListItemIcon>
            <ForumIcon color="primary" />
          </ListItemIcon>
          <ListItemText>Combine Threads</ListItemText>
        </Box>
        <Switch checked={settings.combineThreads} onChange={onCombineThreadsChange} onClick={e => e.stopPropagation()} />
      </MenuItem>

      <Divider sx={{ my: 0, minHeight: 0 }} />

      {/* <MenuItem onClick={onUnignoreAllWarnings}>
        <ListItemIcon>
          <WarningIcon color="primary" />
        </ListItemIcon>
        <ListItemText>Un-Ignore All Warnings</ListItemText>
      </MenuItem> */}

      <MenuItem onClick={() => toast.info("fresh toast!")}>Toast Test</MenuItem>

    </Menu>
  </>;
};

export default SettingsMenu;
