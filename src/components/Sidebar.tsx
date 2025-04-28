import React from 'react';
import { 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Button, 
  Box,
  Divider,
  Badge
} from '@mui/material';
import { styled } from '@mui/material/styles';
import InboxIcon from '@mui/icons-material/Inbox';
import SendIcon from '@mui/icons-material/Send';
import CreateIcon from '@mui/icons-material/Create';
import DeleteIcon from '@mui/icons-material/Delete';
import ReportIcon from '@mui/icons-material/Report';
import DescriptionIcon from '@mui/icons-material/Description';
import { useEmailContext } from '../context/EmailContext';

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

  // Count unread emails per category
  const getUnreadCount = (category: string) => {
    return emails.filter(email => email.category === category && !email.isRead).length;
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
      width: '100%', 
      bgcolor: 'background.paper',
      height: '100%',
      borderRight: '1px solid rgba(0, 0, 0, 0.12)'
    }}>
      <ComposeButton sx={{width: "10em"}}
        variant="contained"
        color="primary"
        startIcon={<CreateIcon />}
        fullWidth
        onClick={handleCompose}
      >
        Compose
      </ComposeButton>
      <Divider sx={{ my: 1 }} />
      <List component="nav" aria-label="mail categories">
        {categories.map((category) => (
          <ListItemButton
            key={category}
            selected={selectedCategory === category}
            onClick={() => handleCategoryClick(category)}
          >
            <ListItemIcon>
              {getCategoryIcon(category)}
            </ListItemIcon>
            <ListItemText primary={category} />
            {getUnreadCount(category) > 0 && (
              <Badge 
                badgeContent={getUnreadCount(category)} 
                color="primary"
                sx={{ mr: 1 }}
              />
            )}
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;