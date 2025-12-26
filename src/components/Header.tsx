import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  InputBase,
  Avatar,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
  useTheme,
  Switch,
  ListItemIcon,
  ListItemText,
  FormControlLabel,
  Radio,
  RadioGroup
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ViewComfyIcon from '@mui/icons-material/ViewComfy';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import ForumIcon from '@mui/icons-material/Forum';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import { getAuthedUser, signOut, useUser } from '../app/gAuthApi';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import { useThemeContext } from '../app/ctxTheme';
import { useApiDataCache } from '../app/ctxApiDataCache';
import GMaelstromIcon from './gMaelstromLogoSvg';
import LabelSettingsDialog from './LabelSettingsDialog';
import { toast } from 'react-toastify';

const onRefreshToken = () => getAuthedUser(true)
  .then(() => toast.success('Gmail API access token refreshed!'))
  .catch(err => toast.error(err.message)); 

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.mode === 'dark'
    ? alpha(theme.palette.common.white, 0.15)
    : alpha(theme.palette.common.black, 0.05),
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.25)
      : alpha(theme.palette.common.black, 0.1),
  },
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '40ch',
    },
  },
}));

const Header: React.FC = () => {
  const theme = useTheme();
  const { mode, toggleTheme, density, setDensity } = useThemeContext();
  const cache = useApiDataCache();
  const [labelSettingsOpen, setLabelSettingsOpen] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const user = useUser();

  const onProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const onSettingsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const onProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const onSettingsMenuClose = () => {
    setSettingsAnchorEl(null);
  };

  const onSignOut = () => signOut().then(window.location.reload);

  const onSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const onSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.info("TBD =)");
  };

  // Theme toggle separately from menu item click
  const onThemeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Stop propagation to prevent the MenuItem's onClick from firing
    event.stopPropagation();
    toggleTheme();
  };

  // Density change
  const onDensityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDensity(event.target.value as 'sparse' | 'condensed');
  };

  // Combine threads toggle
  const onCombineThreadsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    cache.setCombineThreads(!cache.combineThreads);
  };

  // Un-ignore all warnings
  const onUnignoreAllWarnings = () => {
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
    onSettingsMenuClose();
  };

  return (
    <AppBar
      position="static"
      color="default"
      elevation={1}
      sx={{
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.background.default,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GMaelstromIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            gMaelstrom
          </Typography>
        </Box>

        <Box component="form" onSubmit={onSearchSubmit} sx={{ flexGrow: 1, mx: 2 }}>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search mail…"
              inputProps={{ 'aria-label': 'search' }}
              value={searchQuery}
              onChange={onSearchChange}
              fullWidth
            />
          </Search>
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Help">
            <IconButton size="large" component="a" href="https://github.com/Beej126/gMaelstrom#readme" target="_blank" rel="noopener noreferrer">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton
              size="large"
              onClick={onSettingsMenuOpen}
              aria-controls="settings-menu"
              aria-haspopup="true"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          {/* keep for now, maybe bring back later
          
          import AppsIcon from '@mui/icons-material/Apps';

          <Tooltip title="Google Apps">
            <IconButton size="large">
              <AppsIcon />
            </IconButton>
          </Tooltip> */}

          <Tooltip title={user?.name || 'User'}>
            <IconButton
              size="large"
              edge="end"
              aria-haspopup="true"
              onClick={onProfileMenuOpen}
            >
              {user?.picture ? (
                <Avatar src={user.picture} alt={user.name || user.email || 'User'} />
              ) : (
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  {user?.initials || '??'}
                </Avatar>
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* Settings Menu */}
      <Menu
        id="settings-menu"
        anchorEl={settingsAnchorEl}
        open={Boolean(settingsAnchorEl)}
        onClose={onSettingsMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            width: 250,
            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : undefined,
          }
        }}
      >
        <Box px={2} py={1}>
          <Typography variant="subtitle1">Settings</Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={toggleTheme}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1.5
          }}
        >
          <Box display="flex" alignItems="center">
            <ListItemIcon>
              {mode === 'dark' ? <DarkModeIcon color="primary" /> : <LightModeIcon color="primary" />}
            </ListItemIcon>
            <ListItemText>
              {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </ListItemText>
          </Box>
          <Switch
            checked={mode === 'dark'}
            onChange={onThemeToggle}
            onClick={(e) => e.stopPropagation()}
          />
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
            onClick={(e) => e.stopPropagation()}
            sx={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              mt: 0.5,
              mb: 0.5,
              gap: 1
            }}
          >
            <FormControlLabel
              value="sparse"
              control={<Radio size="small" sx={{ p: 0.5, alignSelf: 'center' }} />}
              label={<Typography variant="body2" sx={{ lineHeight: 1.5, alignSelf: 'center', mt: 0.1 }}>Sparse</Typography>}
              sx={{ ml: 0, mr: 2, py: 0, minHeight: 0, alignItems: 'center' }}
            />
            <FormControlLabel
              value="condensed"
              control={<Radio size="small" sx={{ p: 0.5, alignSelf: 'center' }} />}
              label={<Typography variant="body2" sx={{ lineHeight: 1.5, alignSelf: 'center', mt: 0.1 }}>Condensed</Typography>}
              sx={{ ml: 0, mr: 0, py: 0, minHeight: 0, alignItems: 'center' }}
            />
          </RadioGroup>
        </MenuItem>
        <Divider sx={{ my: 0, minHeight: 0 }} />
        <MenuItem
          onClick={() => cache.setCombineThreads(!cache.combineThreads)}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1.5
          }}
        >
          <Box display="flex" alignItems="center">
            <ListItemIcon>
              <ForumIcon color="primary" />
            </ListItemIcon>
            <ListItemText>Combine Threads</ListItemText>
          </Box>
          <Switch
            checked={cache.combineThreads}
            onChange={onCombineThreadsChange}
            onClick={(e) => e.stopPropagation()}
          />
        </MenuItem>
        <Divider sx={{ my: 0, minHeight: 0 }} />
        <MenuItem
          onClick={() => { setLabelSettingsOpen(true); onSettingsMenuClose(); }}
          sx={{ display: 'flex', alignItems: 'center', py: 1.5 }}
        >
          <ListItemIcon>
            <LabelOutlinedIcon color="primary" />
          </ListItemIcon>
          <ListItemText>Label Settings</ListItemText>
        </MenuItem>
        {/* Host the Label Settings Dialog here, controlled by local state */}
        <LabelSettingsDialog open={labelSettingsOpen} onClose={() => setLabelSettingsOpen(false)} />
        <Divider sx={{ my: 0, minHeight: 0 }} />
        <MenuItem
          onClick={onUnignoreAllWarnings}
          sx={{ display: 'flex', alignItems: 'center', py: 1.5 }}
        >
          <ListItemIcon>
            <WarningIcon color="primary" />
          </ListItemIcon>
          <ListItemText>Un-Ignore All Warnings</ListItemText>
        </MenuItem>
      </Menu>

      {/* Profile Menu */}
      <Menu
        id="profile-menu"
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        onClose={onProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            minWidth: 'unset',
            width: 'auto',
            maxWidth: 'none',
            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : undefined,
            px: 2
          }
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1">{user?.name}</Typography>
          <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
        </Box>
        <Divider />
        <MenuItem
          component="a"
          href={user?.email ? `https://myaccount.google.com/?authuser=${encodeURIComponent(user.email)}` : 'https://myaccount.google.com'}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onProfileMenuClose}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>My account</ListItemText>
        </MenuItem>
        <MenuItem onClick={onSignOut}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
        <MenuItem onClick={onRefreshToken}>
          <ListItemIcon>
            <RefreshIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Refresh Auth Token</ListItemText>
        </MenuItem>
      </Menu>

      {/* Host the Label Settings Dialog here, controlled by context */}
      <LabelSettingsDialog open={labelSettingsOpen} onClose={() => setLabelSettingsOpen(false)} />
    </AppBar>
  );
};

export default Header;