import React, { useState } from 'react';
import {
  Menu,
  MenuItem,
  Divider,
  Box,
  Typography,
  ListItemIcon,
  ListItemText,
  Tooltip,
  IconButton,
  Avatar,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { useUser, signOut } from './gAuthApi';

const ProfileMenu: React.FC = _ => {

  const user = useUser();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const onOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const onClose = () => {
    setAnchorEl(null);
  };


  return <>

    <Tooltip title={user?.name ?? 'Please sign in'}>
      <IconButton
        sx={{ mx: -0.75 }}
        size="large"
        edge="end"
        aria-haspopup="true"
        onClick={onOpen}
      >
        {user?.picture ? (
          <Avatar src={user.picture} alt={user.name ?? user.email} />
        ) : (
          <Avatar >
            {user?.initials ?? '??'}
          </Avatar>
        )}
      </IconButton>
    </Tooltip>


    <Menu
      id="profile-menu"
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      PaperProps={{ sx: { minWidth: 'unset', width: 'auto', maxWidth: 'none', px: 2 } }}
    >

      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="subtitle1">{user?.name}</Typography>
        <Typography noWrap variant="body2" color="text.secondary">{user?.email}</Typography>
      </Box>

      <Divider />

      <MenuItem
        component="a"
        href={'https://myaccount.google.com'}
        target="_blank"
        onClick={onClose}
      >
        <ListItemIcon>
          <PersonIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>My account</ListItemText>
      </MenuItem>

      <MenuItem onClick={signOut}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Sign {!user?.authFailed ? 'out' : 'in'}</ListItemText>
      </MenuItem>
      
    </Menu>
  </>;
};

export default ProfileMenu;
