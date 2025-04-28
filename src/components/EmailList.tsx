import React, { useState } from 'react';
import { 
  List, 
  ListItemButton, 
  Typography, 
  Box, 
  Chip,
  Checkbox,
  IconButton,
  useTheme,
  Button,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useEmailContext } from '../context/EmailContext';
import { useThemeContext } from '../context/ThemeContext';
import { Email } from '../types/email';
import ForumIcon from '@mui/icons-material/Forum';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

interface EmailItemProps {
  email: Email;
  selected: boolean;
  onClick: () => void;
  onStarClick: (emailId: string) => void;
  onCheckboxClick: (emailId: string, checked: boolean) => void;
  isChecked: boolean;
}

const EmailItem: React.FC<EmailItemProps> = ({ 
  email, 
  selected, 
  onClick, 
  onStarClick,
  onCheckboxClick,
  isChecked
}) => {
  const theme = useTheme();
  const { density, fontSize, fontWeight } = useThemeContext();
  // Get thread count for this email if we're in combined mode
  const { emails, combineThreads } = useEmailContext();
  const threadCount = React.useMemo(() => {
    if (!combineThreads) return 0;
    return emails.filter(e => e.gapiMessage.threadId === email.gapiMessage.threadId).length;
  }, [emails, email.gapiMessage.threadId, combineThreads]);

  // Extract sender name from the from field
  const senderName = React.useMemo(() => {
    const match = email.from.match(/(.*?)\s*<.*>/);
    return match ? match[1].trim() : email.from.split('@')[0];
  }, [email.from]);

  // Handle star click without propagation
  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStarClick(email.id);
  };

  // Handle checkbox click without propagation
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckboxClick(email.id, !isChecked);
  };

  // Set height based on density setting
  const itemHeight = density === 'condensed' ? '32px' : '40px';

  return (
    <>
      <ListItemButton 
        selected={selected}
        onClick={onClick}
        sx={{ 
          bgcolor: email.isRead ? 'transparent' : theme.palette.mode === 'light' ? '#f2f6fc' : '#1a1a1a',
          '&:hover': {
            bgcolor: selected ? theme.palette.action.selected : theme.palette.mode === 'light' ? '#f5f5f5' : '#333333'
          },
          px: 1,
          borderBottom: theme.palette.mode === 'light' ? '1px solid #f5f5f5' : '1px solid #333333',
          height: itemHeight,
          position: 'relative'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: '4px', marginLeft: '8px' }}>
          {/* Checkbox */}
          <Checkbox 
            size="small" 
            edge="start"
            checked={isChecked}
            onClick={handleCheckboxClick}
            sx={{ p: density === 'condensed' ? 0.3 : 0.5 }}
          />
          
          {/* Star Icon */}
          <IconButton size="small" onClick={handleStarClick} sx={{ p: density === 'condensed' ? 0.3 : 0.5 }}>
            {email.isStarred ? 
              <StarIcon fontSize="small" sx={{ color: '#f4b400' }} /> : 
              <StarBorderIcon fontSize="small" sx={{ color: theme.palette.mode === 'light' ? '#5f6368' : '#949494' }} />
            }
          </IconButton>

          {/* Thread arrow for conversation threads */}
          {threadCount > 1 && (
            <ArrowRightIcon fontSize="small" sx={{ color: theme.palette.mode === 'light' ? '#5f6368' : '#949494', mr: -0.5 }} />
          )}
          
          {/* Email Content - all on one line */}
          <Box sx={{ 
            display: 'flex', 
            width: '100%', 
            alignItems: 'center', 
            overflow: 'hidden',
            pl: 0.5
          }}>
            {/* Sender */}
            <Typography 
              component="span"
              sx={{ 
                width: '180px', 
                mr: 1.5,
                flexShrink: 0,
                fontSize: fontSize.primary,
                fontWeight: email.isRead ? fontWeight.regular : fontWeight.emailListFrom,
                color: theme => email.isRead ? theme.palette.text.primary : theme.palette.text.secondary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {senderName}
            </Typography>
            
            {/* Subject and Snippet */}
            <Box sx={{ 
              display: 'flex', 
              flexGrow: 1, 
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              mr: 1
            }}>
              <Typography 
                sx={{ 
                  mr: 1,
                  fontSize: fontSize.primary,
                  fontWeight: email.isRead ? fontWeight.regular : fontWeight.emailListSubject,
                  color: theme => email.isRead ? theme.palette.text.primary : theme.palette.text.secondary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {email.subject}
              </Typography>
              <Typography 
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '50%',
                  opacity: 0.7,
                  fontSize: fontSize.secondary,
                  color: 'text.secondary'
                }}
              >
                - {email.gapiMessage.snippet}
              </Typography>
            </Box>
            
            {/* Attachment indicator */}
            {email.hasAttachments && (
              <AttachFileIcon 
                fontSize={density === 'condensed' ? 'inherit' : 'small'} 
                sx={{ 
                  mx: 0.5, 
                  color: theme.palette.mode === 'light' ? '#5f6368' : '#949494', 
                  transform: 'rotate(45deg)',
                  flexShrink: 0,
                  ...(density === 'condensed' && { fontSize: '16px' })
                }} 
              />
            )}
            
            {/* Thread count if applicable */}
            {threadCount > 1 && (
              <Chip
                icon={<ForumIcon fontSize={density === 'condensed' ? 'inherit' : 'small'} />}
                label={`${threadCount}`}
                size="small"
                sx={{ 
                  height: density === 'condensed' ? 16 : 20, 
                  flexShrink: 0,
                  '& .MuiChip-label': { 
                    fontSize: fontSize.chip,
                    padding: density === 'condensed' ? '0 6px' : '0 8px'
                  }
                }}
                variant="outlined"
              />
            )}
            
            {/* Date */}
            <Typography 
              component="span" 
              sx={{ 
                ml: 1.5, 
                minWidth: '70px', 
                textAlign: 'right',
                flexShrink: 0,
                fontSize: fontSize.caption,
                color: 'text.secondary'
              }}
            >
              {formatDistanceToNow(new Date(email.date), { addSuffix: false })}
            </Typography>
          </Box>
        </Box>
      </ListItemButton>
    </>
  );
};

const EmailList: React.FC = () => {
  const { 
    emails, 
    selectedEmail, 
    setSelectedEmail, 
    loadMoreEmails, 
    hasMoreEmails, 
    loading 
  } = useEmailContext();
  const [checkedEmails, setCheckedEmails] = useState<Record<string, boolean>>({});
  const [starredEmails, setStarredEmails] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const theme = useTheme();

  // Initialize from email data
  React.useEffect(() => {
    const initialStarred: Record<string, boolean> = {};
    emails.forEach(email => {
      if (email.isStarred) initialStarred[email.id] = true;
    });
    setStarredEmails(initialStarred);
  }, []);

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    // Navigate to the email detail page
    navigate(`/email/${email.id}`);
  };

  const handleStarClick = (emailId: string) => {
    setStarredEmails(prev => ({
      ...prev,
      [emailId]: !prev[emailId]
    }));
  };

  const handleCheckboxClick = (emailId: string, checked: boolean) => {
    setCheckedEmails(prev => ({
      ...prev,
      [emailId]: checked
    }));
  };

  const handleLoadMore = () => {
    loadMoreEmails();
  };

  return (
    <>
      <List sx={{ 
        width: '100%', 
        bgcolor: 'background.paper', 
        padding: 0,
        '& .MuiListItemButton-root:hover': {
          bgcolor: theme => theme.palette.mode === 'light' ? '#f5f5f5' : '#333333'
        }
      }}>
        {emails.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No emails found
            </Typography>
          </Box>
        ) : (
          emails.map((email) => (
            <EmailItem
              key={email.id}
              email={{
                ...email,
                isStarred: starredEmails[email.id] || false
              }}
              selected={selectedEmail?.id === email.id}
              onClick={() => handleEmailClick(email)}
              onStarClick={handleStarClick}
              onCheckboxClick={handleCheckboxClick}
              isChecked={!!checkedEmails[email.id]}
            />
          ))
        )}
      </List>
      
      {/* Load More button */}
      {hasMoreEmails && (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            p: 2, 
            borderTop: `1px solid ${theme.palette.divider}`
          }}
        >
          <Button 
            onClick={handleLoadMore}
            disabled={loading}
            sx={{ 
              textTransform: 'none',
              minWidth: '150px'
            }}
            variant="outlined"
            size="small"
          >
            {loading ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : (
              'Load older emails'
            )}
          </Button>
        </Box>
      )}
    </>
  );
};

export default EmailList;