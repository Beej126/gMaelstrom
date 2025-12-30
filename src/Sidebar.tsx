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
import InboxIcon from '@mui/icons-material/Inbox';
import SendIcon from '@mui/icons-material/Send';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import ReportIcon from '@mui/icons-material/Report';
import DescriptionIcon from '@mui/icons-material/Description';
import MenuIcon from '@mui/icons-material/Menu';
import { useApiDataCache } from './ctxApiDataCache';
import { isRead } from './helpers/emailParser';
import { toast } from 'react-toastify';

const ComposeButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1, 3),
  textTransform: 'none',
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
  },
}));

const labelMap: Record<string, { labelId: string; icon: React.ReactNode }> = {
  'Inbox': { labelId: 'INBOX', icon: <InboxIcon /> },
  'Sent': { labelId: 'SENT', icon: <SendIcon /> },
  'Drafts': { labelId: 'DRAFT', icon: <DescriptionIcon /> },
  'Spam': { labelId: 'SPAM', icon: <ReportIcon /> },
  'Trash': { labelId: 'TRASH', icon: <DeleteIcon /> },
};


const Sidebar: React.FC = () => {

  const cache = useApiDataCache();

  const [collapsed, setCollapsed] = React.useState(false);


  const getUnreadCount = (category: string) => {
    const labelId = labelMap[category]?.labelId || 'INBOX';
    return cache.emails.filter(email => (email.labelIds || []).includes(labelId) && !isRead(email)).length;
  };

  const onCategoryClick = (category: string) => {
    cache.setSelectedCategory(category);
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
        {cache.categories.map((category) => (
          <ListItemButton
            key={category}
            selected={cache.selectedCategory === category}
            onClick={() => onCategoryClick(category)}
            sx={collapsed ? { justifyContent: 'center', px: 0 } : {}}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1, justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {labelMap[category]?.icon || <InboxIcon />}
                {getUnreadCount(category) > 0 && (
                  <Badge
                    badgeContent={getUnreadCount(category)}
                    color="primary"
                    sx={{ ml: 0.5 }}
                  />
                )}
              </Box>
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary={category}
                sx={{
                  color: theme => theme.palette.mode === 'light' ? '#222' : theme.palette.text.primary,
                  fontWeight: cache.selectedCategory === category ? 600 : 400,
                  ml: 1.5
                }}
              />
            )}
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;