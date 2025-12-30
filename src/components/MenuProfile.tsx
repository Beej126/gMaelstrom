import React from 'react';
import {
  Menu,
  MenuItem,
  Divider,
  Box,
  Typography,
  ListItemIcon,
  ListItemText,
  Avatar
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ProfileMenuProps {
  anchorEl: null | HTMLElement;
  open: boolean;
  onClose: () => void;
  user: {
    name?: string;
    email?: string;
    picture?: string;
    initials?: string;
  } | null;
  onSignOut: () => void;
  onRefreshToken: () => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  anchorEl,
  open,
  onClose,
  user,
  onSignOut,
  onRefreshToken
}) => (
  <Menu
    id="profile-menu"
    anchorEl={anchorEl}
    open={open}
    onClose={onClose}
    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    PaperProps={{ sx: { minWidth: 'unset', width: 'auto', maxWidth: 'none', px: 2 } }}
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
      onClick={onClose}
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
);

export default ProfileMenu;
