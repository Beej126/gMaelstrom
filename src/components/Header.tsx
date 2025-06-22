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
import AppsIcon from '@mui/icons-material/Apps';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ViewComfyIcon from '@mui/icons-material/ViewComfy';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import ForumIcon from '@mui/icons-material/Forum';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import { getUser, signOut } from '../services/authService';
import { useThemeContext } from '../context/ThemeContext';
import { useEmailContext } from '../context/EmailContext';
import GMaelstromIcon from './gMaelstromIcon';

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
  const emailContext = useEmailContext();
  const { combineThreads, setCombineThreads } = emailContext;
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsAnchorEl, setSettingsAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const user = getUser();
  
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleSettingsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleSettingsMenuClose = () => {
    setSettingsAnchorEl(null);
  };

  const handleSignOut = () => {
    signOut().then(() => {
      window.location.href = '/login';
    });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Implement search functionality here
    console.log('Search for:', searchQuery);
  };

  // Handle theme toggle separately from menu item click
  const handleThemeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Stop propagation to prevent the MenuItem's onClick from firing
    event.stopPropagation();
    toggleTheme();
  };

  // Handle density change
  const handleDensityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDensity(event.target.value as 'sparse' | 'condensed');
  };

  // Handle combine threads toggle
  const handleCombineThreadsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setCombineThreads(!combineThreads);
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
        
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ flexGrow: 1, mx: 2 }}>
          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Search mail…"
              inputProps={{ 'aria-label': 'search' }}
              value={searchQuery}
              onChange={handleSearchChange}
              fullWidth
            />
          </Search>
        </Box>
        
        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Help">
            <IconButton size="large">
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Settings">
            <IconButton 
              size="large"
              onClick={handleSettingsMenuOpen}
              aria-controls="settings-menu"
              aria-haspopup="true"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Google Apps">
            <IconButton size="large">
              <AppsIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={user?.getName() || 'User'}>
            <IconButton
              size="large"
              edge="end"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
            >
              {user?.getImageUrl() ? (
                <Avatar src={user.getImageUrl()} alt={user.getName()} />
              ) : (
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  {user?.getName()?.charAt(0) || 'U'}
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
        onClose={handleSettingsMenuClose}
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
            onChange={handleThemeToggle}
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
            onChange={handleDensityChange}
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
          onClick={() => setCombineThreads(!combineThreads)} 
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
            checked={combineThreads}
            onChange={handleCombineThreadsChange}
            onClick={(e) => e.stopPropagation()}
          />
        </MenuItem>
        <Divider sx={{ my: 0, minHeight: 0 }} />
        <MenuItem 
          onClick={() => { emailContext.setLabelSettingsOpen(true); handleSettingsMenuClose(); }}
          sx={{ display: 'flex', alignItems: 'center', py: 1.5 }}
        >
          <ListItemIcon>
            <LabelOutlinedIcon color="primary" />
          </ListItemIcon>
          <ListItemText>Label Settings</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Profile Menu */}
      <Menu
        id="profile-menu"
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        onClose={handleProfileMenuClose}
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
          <Typography variant="subtitle1">{user?.getName()}</Typography>
          <Typography variant="body2" color="text.secondary">{user?.getEmail()}</Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>My account</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSignOut}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Header;