import React from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Box,
  Divider,
  Badge,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CreateIcon from '@mui/icons-material/Create';
import MenuIcon from '@mui/icons-material/Menu';
import { useApiDataCache } from './ctxApiDataCache';
import { isRead } from './helpers/emailParser';
import { toast } from 'react-toastify';

const ComposeButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
}));


const Sidebar: React.FC = () => {

  const cache = useApiDataCache();
  const [collapsed, setCollapsed] = React.useState(false);

  const getUnreadCount = (labelId: string) => 
    cache.emails.filter(email => (email.labelIds || []).includes(labelId) && !isRead(email)).length;

  const onLabelClick = (labelId: string) => {
    cache.setSelectedLabelId(labelId);
  };

  const onComposeClick = () => {
    toast.info("TBD =)");
  };

  return (
    <Box sx={{
      width: collapsed ? 55 : 'max-content',
      minWidth: 55,
      bgcolor: 'background.paper',
      height: '100%',
      borderRight: '1px solid rgba(0, 0, 0, 0.12)',
      transition: 'width 0.2s',
      overflow: 'hidden'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', px: 1, pt: 1 }}>
        <IconButton size="small" onClick={() => setCollapsed(c => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <MenuIcon />
        </IconButton>
      </Box>
      {!collapsed && (
        <ComposeButton sx={{ width: "10em" }}
          variant="contained"
          color="primary"
          startIcon={<CreateIcon />}
          fullWidth
          onClick={onComposeClick}
        >
          Compose
        </ComposeButton>
      )}

      {!collapsed && <Divider sx={{ my: 1 }} />}

      <List component="nav" aria-label="mail categories">

        {Object.values(cache.labels || {}).map(label =>

          <ListItemButton
            key={label.id}
            selected={cache.selectedLabelId === label.id}
            onClick={() => onLabelClick(label.id)}
            sx={collapsed ? { justifyContent: 'center', px: 0 } : {}}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1, justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {label.icon}
                {getUnreadCount(label.id) > 0 && (
                  <Badge
                    badgeContent={getUnreadCount(label.id)}
                    color="primary"
                    sx={{ ml: 0.5 }}
                  />
                )}
              </Box>
            </ListItemIcon>

            {!collapsed && (
              <ListItemText
                primary={label.displayName}
                sx={{
                  color: theme => theme.palette.mode === 'light' ? '#222' : theme.palette.text.primary,
                  fontWeight: cache.selectedLabelId === label.id ? 600 : 400,
                  ml: 1.5
                }}
              />
            )}
          </ListItemButton>
        )}

      </List>

    </Box>
  );
};

export default Sidebar;