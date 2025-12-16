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
import { useEmailContext } from '../app/ctxEmail';
import { isRead } from '../helpers/emailParser';
  
const ComposeButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
  borderRadius: theme.shape.borderRadius * 4,
  padding: theme.spacing(1, 3),
  textTransform: 'none',
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
  },
}));

const Sidebar: React.FC = () => {
  const { 
    categories, 
    selectedCategory, 
    setSelectedCategory, 
    emails 
  } = useEmailContext();

  const [collapsed, setCollapsed] = React.useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Inbox':
        return <InboxIcon />;
      case 'Sent':
        return <SendIcon />;
      case 'Drafts':
        return <DescriptionIcon />;
      case 'Spam':
        return <ReportIcon />;
      case 'Trash':
        return <DeleteIcon />;
      default:
        return <InboxIcon />;
    }
  };

  // Count unread emails per category using labelIds and isRead helper
  const labelMap: Record<string, string> = {
    'Inbox': 'INBOX',
    'Sent': 'SENT',
    'Drafts': 'DRAFT',
    'Spam': 'SPAM',
    'Trash': 'TRASH',
  };
  const getUnreadCount = (category: string) => {
    const labelId = labelMap[category] || 'INBOX';
    return emails.filter(email => (email.labelIds || []).includes(labelId) && !isRead(email)).length;
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  const handleCompose = () => {
    // Handle compose action - to be implemented
    console.log('Compose new email');
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
        <ComposeButton sx={{width: "10em"}}
          variant="contained"
          color="primary"
          startIcon={<CreateIcon />}
          fullWidth
          onClick={handleCompose}
        >
          Compose
        </ComposeButton>
      )}
      {!collapsed && <Divider sx={{ my: 1 }} />}
      <List component="nav" aria-label="mail categories">
        {categories.map((category) => (
          <ListItemButton
            key={category}
            selected={selectedCategory === category}
            onClick={() => handleCategoryClick(category)}
            sx={collapsed ? { justifyContent: 'center', px: 0 } : {}}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1, justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getCategoryIcon(category)}
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
                  fontWeight: selectedCategory === category ? 600 : 400,
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