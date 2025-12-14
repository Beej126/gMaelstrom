import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Chip,
  Checkbox,
  useTheme,
  Button,
  CircularProgress
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { useEmailContext } from '../context/EmailContext';
import { useThemeContext } from '../context/ThemeContext';
import { Email } from '../types/email';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { useNavigate } from 'react-router-dom';

interface EmailItemProps {
  email: Email;
  selected: boolean;
  onCheckboxClick: (emailId: string, checked: boolean) => void;
  isChecked: boolean;
  threadCount: number;
  labelVisibility: Record<string, boolean>;
}

const EmailItem: React.FC<EmailItemProps> = ({
  email,
  selected,
  onCheckboxClick,
  isChecked,
  threadCount,
  labelVisibility
}) => {
  const theme = useTheme();
  const { density, fontSize, fontWeight } = useThemeContext();
  const navigate = useNavigate();
  const prettifyLabel = usePrettifyLabel();

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckboxClick(email.id, !isChecked);
  };

  const handleEmailClick = () => {
    navigate(`/email/${email.id}`);
  };

  const itemHeight = density === 'condensed' ? '32px' : '40px';

  return (
    <div
      tabIndex={0}
      onClick={handleEmailClick}
      style={{
        background: selected ? theme.palette.action.selected : (email.isRead ? 'transparent' : theme.palette.mode === 'light' ? '#f2f6fc' : '#1a1a1a'),
        borderBottom: theme.palette.mode === 'light' ? '1px solid #f5f5f5' : '1px solid #333333',
        height: itemHeight,
        cursor: 'pointer',
        outline: selected ? `2px solid ${theme.palette.primary.main}` : undefined,
        transition: 'background 0.2s',
        paddingLeft: 8,
        paddingRight: 8,
        display: 'contents'
      }}
    >
      {/* Checkbox */}
      <Checkbox
        size="small"
        edge="start"
        checked={isChecked}
        onClick={handleCheckboxClick}
        sx={{
          gridColumn: 1,
          p: density === 'condensed' ? 0.3 : 0.5,
          ml: 0,
          position: 'relative',
          top: density === 'condensed' ? '-4px' : '-6px'
        }}
      />
      {/* Labels */}
      <div style={{ gridColumn: 2, display: 'flex', flexDirection: 'row', gap: 4, overflow: 'hidden' }}>
        {email.labelIds && email.labelIds.length > 0 && email.labelIds
          .filter(label => labelVisibility[label] !== false) // Only show if ON or not set
          .map(label => (
            <Chip
              key={label}
              label={prettifyLabel(label)}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.72rem',
                bgcolor: theme.palette.mode === 'light' ? '#e0e0e0' : '#444',
                color: theme.palette.text.primary,
                px: '0px',
                borderRadius: 1.5,
                fontWeight: 500,
                overflow: 'visible',
                textOverflow: 'clip',
                whiteSpace: 'nowrap'
              }}
              variant="outlined"
            />
          ))}
      </div>
      {/* From */}
      <Typography
        component="span"
        sx={{
          gridColumn: 3,
          fontSize: fontSize.primary,
          fontWeight: email.isRead ? 500 : fontWeight.emailListFrom,
          color: theme => email.isRead ? theme.palette.text.secondary : theme.palette.text.primary,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          mr: 1,
          opacity: email.isRead ? 0.85 : 1
        }}
      >
        {email.from}
      </Typography>
      {/* Subject and Snippet */}
      <div style={{ gridColumn: 4, display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <Typography
          sx={{
            mr: 1,
            fontSize: fontSize.primary,
            fontWeight: email.isRead ? 500 : fontWeight.emailListSubject,
            color: theme => email.isRead ? theme.palette.text.secondary : theme.palette.text.primary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            opacity: email.isRead ? 0.85 : 1
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
            opacity: email.isRead ? 0.7 : 0.8,
            fontSize: fontSize.secondary,
            color: 'text.secondary'
          }}
        >
          - {email.gapiMessage.snippet}
        </Typography>
      </div>
      {/* Attachment icon */}
      <div style={{ gridColumn: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {email.hasAttachments && (
          <AttachFileIcon
            fontSize={density === 'condensed' ? 'inherit' : 'small'}
            sx={{
              color: theme.palette.mode === 'light' ? '#5f6368' : '#949494',
              transform: 'rotate(45deg)',
              flexShrink: 0,
              ...(density === 'condensed' && { fontSize: '16px' })
            }}
          />
        )}
      </div>
      {/* Thread arrow */}
      <div style={{ gridColumn: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {threadCount > 1 && (
          <ArrowRightIcon fontSize="small" sx={{ color: theme.palette.mode === 'light' ? '#5f6368' : '#949494' }} />
        )}
      </div>
      {/* Date */}
      <Typography
        component="span"
        sx={{
          gridColumn: 7,
          minWidth: '70px',
          textAlign: 'right',
          flexShrink: 0,
          fontSize: fontSize.caption,
          color: 'text.secondary'
        }}
      >
        {formatDistanceToNow(new Date(email.date), { addSuffix: false })}
      </Typography>
    </div>
  );
};

interface EmailListProps {
  checkedEmails?: Record<string, boolean>;
  setCheckedEmails?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const EmailList: React.FC<EmailListProps> = ({ checkedEmails: checkedEmailsProp, setCheckedEmails: setCheckedEmailsProp }) => {
  const {
    emails,
    selectedEmail,
    loadMoreEmails,
    hasMoreEmails,
    loading,
    labelVisibility
  } = useEmailContext();
  // Use controlled checkedEmails if provided, otherwise internal state
  const [internalCheckedEmails, internalSetCheckedEmails] = useState<Record<string, boolean>>({});
  const checkedEmails = checkedEmailsProp ?? internalCheckedEmails;
  const setCheckedEmails = setCheckedEmailsProp ?? internalSetCheckedEmails;
  const theme = useTheme();

  // Initialize from email data
  React.useEffect(() => {
    const initialStarred: Record<string, boolean> = {};
    emails.forEach(email => {
      if (email.isStarred) initialStarred[email.id] = true;
    });
    setCheckedEmails(initialStarred);
  }, []);

  // Ensure checkedEmails always has all visible email IDs as keys
  useEffect(() => {
    if (!checkedEmailsProp || !setCheckedEmailsProp) return;
    const newChecked: Record<string, boolean> = { ...checkedEmails };
    let changed = false;
    emails.forEach(email => {
      if (!(email.id in newChecked)) {
        newChecked[email.id] = false;
        changed = true;
      }
    });
    // Remove any keys for emails no longer in the list
    Object.keys(newChecked).forEach(id => {
      if (!emails.find(e => e.id === id)) {
        delete newChecked[id];
        changed = true;
      }
    });
    if (changed) setCheckedEmails(newChecked);
  }, [emails, selectedEmail]);

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
      <div
        key={emails.map(e => e.id + (e.isRead ? 'r' : 'u')).join(',') + (selectedEmail ? selectedEmail.id : '')}
        style={{ width: '100%', display: 'grid', gridTemplateColumns: 'max-content max-content max-content 1fr 32px 40px 90px', columnGap: "5px", paddingTop: "6px", paddingRight: '0.5em' }}
      >
        {/* Header row for accessibility (optional) */}
        {/* <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '32px minmax(80px, max-content) 180px 1fr 32px 40px 90px', fontWeight: 600, fontSize: 14, color: '#888', padding: '0 8px' }}> ... </div> */}
        {emails.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center', gridColumn: '1 / -1' }}>
            <Typography variant="body1" color="text.secondary">
              No emails found
            </Typography>
          </Box>
        ) : (
          emails.map((email) => (
            <EmailItem
              key={email.id}
              email={email}
              selected={selectedEmail?.id === email.id}
              onCheckboxClick={handleCheckboxClick}
              isChecked={!!checkedEmails[email.id]}
              threadCount={emails.filter(e => e.gapiMessage.threadId === email.gapiMessage.threadId).length}
              labelVisibility={labelVisibility}
            />
          ))
        )}
        {/* Load More button */}
        {hasMoreEmails && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              p: 2,
              borderTop: `1px solid ${theme.palette.divider}`,
              gridColumn: '1 / -1'
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
      </div>
    </>
  );
};

// Map of Gmail label IDs to friendly names
const LABEL_NAME_MAP: Record<string, string> = {
  INBOX: 'Inbox',
  SENT: 'Sent',
  DRAFT: 'Draft',
  SPAM: 'Spam',
  TRASH: 'Trash',
  IMPORTANT: 'Important',
  STARRED: 'Starred',
  UNREAD: 'Unread',
  PENDING: 'Pending',
  CATEGORY_UPDATES: 'Updates',
  CATEGORY_FORUMS: 'Forums',
  CATEGORY_PROMOTIONS: 'Promotions',
  CATEGORY_SOCIAL: 'Social',
  CATEGORY_PERSONAL: 'Personal',
  // Add more mappings as needed
};
// Creates a prettifyLabel function with access to the dynamic label map
const usePrettifyLabel = () => {
  const { dynamicLabelNameMap } = useEmailContext();
  
  return (labelId: string): string => {
    // Prefer dynamic label name from Gmail API, but prettify it if it looks like a system label
    if (dynamicLabelNameMap[labelId]) {
      let name = dynamicLabelNameMap[labelId];
      if (/^CATEGORY_/.test(labelId) || /_/.test(name)) {
        name = name.replace(/^CATEGORY_/, '').replace(/_/g, ' ');
        name = name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
      }
      return name;
    }
    if (LABEL_NAME_MAP[labelId]) return LABEL_NAME_MAP[labelId];
    let label = labelId.replace(/^CATEGORY_/, '').replace(/_/g, ' ');
    label = label.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
    return label;
  };
};

export default EmailList;