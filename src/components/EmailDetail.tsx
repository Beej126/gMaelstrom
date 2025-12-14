import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  Tooltip,
  Avatar,
  CircularProgress,
  Button,
  useTheme
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import LabelIcon from '@mui/icons-material/Label';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ReplyIcon from '@mui/icons-material/Reply';
import ForwardIcon from '@mui/icons-material/Forward';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import { useEmailContext } from '../context/EmailContext';
import { getEmailThread, getAttachmentData, markEmailsAsRead, markEmailsAsUnread } from '../services/gmailService';
import { Email } from '../types/email';
import {
  decodeBase64,
  extractHtmlContent,
  extractInlineAttachments,
  replaceInlineAttachments,
  extractAttachments,
  Attachment,
  InlineAttachment,
  processEmailContentForDarkMode
} from '../utils/emailParser';
import AttachmentList from '../components/AttachmentList';
import styles from './EmailDetail.module.scss';

// Separate component for email content
interface EmailContentProps {
  email: Email;
  inlineAttachments: Map<string, Record<string, InlineAttachment>>;
  isDarkMode: boolean;
}

const EmailContent: React.FC<EmailContentProps> = ({ email, inlineAttachments, isDarkMode }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    const processEmailContent = async () => {
      setLoading(true);

      try {
        let htmlContent = '';

        // Get the basic HTML content first
        const extractedHtml = extractHtmlContent(email.gapiMessage.payload);
        if (extractedHtml) {
          htmlContent = extractedHtml;
        } else if (email.gapiMessage.payload?.body?.data) {
          // Handle direct body data
          const decoded = decodeBase64(email.gapiMessage.payload.body.data);
          // Check if content is already HTML or needs conversion
          htmlContent = decoded.trim().startsWith('<') ? decoded : decoded.replace(/\n/g, '<br/>');
        } else if (email.gapiMessage.payload?.parts) {
          // Handle multipart emails
          // First look for HTML content
          const htmlPart = email.gapiMessage.payload.parts.find(part =>
            part.mimeType === 'text/html' && part.body?.data
          );

          // Then look for plain text content
          const textPart = email.gapiMessage.payload.parts.find(part =>
            part.mimeType === 'text/plain' && part.body?.data
          );

          // Check for attachments that might be inline content
          const inlineHtmlPart = email.gapiMessage.payload.parts.find(part =>
            part.mimeType === 'text/html' &&
            part.headers?.some(h => h.name?.toLowerCase() === 'content-disposition' &&
              h.value?.toLowerCase().includes('inline'))
          );

          // Prefer HTML content over plain text
          if (htmlPart && htmlPart.body?.data) {
            htmlContent = decodeBase64(htmlPart.body.data);
          } else if (inlineHtmlPart && inlineHtmlPart.body?.data) {
            htmlContent = decodeBase64(inlineHtmlPart.body.data);
          } else if (textPart && textPart.body?.data) {
            const plainText = decodeBase64(textPart.body.data);
            // Convert plain text to HTML with line breaks
            htmlContent = plainText.replace(/\n/g, '<br/>');
          } else {
            // Handle nested multipart messages
            for (const part of email.gapiMessage.payload.parts) {
              if (part.parts) {
                const nestedHtmlPart = part.parts.find(p =>
                  p.mimeType === 'text/html' && p.body?.data
                );
                if (nestedHtmlPart && nestedHtmlPart.body?.data) {
                  htmlContent = decodeBase64(nestedHtmlPart.body.data);
                  break;
                }

                const nestedTextPart = part.parts.find(p =>
                  p.mimeType === 'text/plain' && p.body?.data
                );
                if (nestedTextPart && nestedTextPart.body?.data) {
                  htmlContent = decodeBase64(nestedTextPart.body.data).replace(/\n/g, '<br/>');
                  break;
                }
              }
            }
          }
        }

        // If no content was found but we have a snippet, use that
        if (!htmlContent && email.gapiMessage.snippet) {
          htmlContent = `<p>${email.gapiMessage.snippet}...</p><p><i>(Full message content not available)</i></p>`;
        }

        // If we still have no content, show a message
        if (!htmlContent) {
          htmlContent = '<p>No content available</p>';
        }

        // Replace inline image references with actual data
        if (inlineAttachments.has(email.id)) {
          // This is now an async operation that can fetch missing image data
          htmlContent = await replaceInlineAttachments(
            htmlContent,
            inlineAttachments.get(email.id) || {},
            // Pass the getAttachmentData function to fetch missing attachments
            async (messageId, attachmentId) => {
              try {
                return await getAttachmentData(messageId, attachmentId);
              } catch (error) {
                console.error(`Error fetching attachment ${attachmentId}:`, error);
                return '';
              }
            }
          );
        }

        // Process for dark mode
        const processedContent = processEmailContentForDarkMode(htmlContent, isDarkMode);
        setContent(processedContent);
      } catch (error) {
        console.error(`Error processing email content for ${email.id}:`, error);
        setContent('<p>Error loading content</p>');
      } finally {
        setLoading(false);
      }
    };

    processEmailContent();
  }, [email.id, email.gapiMessage.payload, email.gapiMessage.snippet, inlineAttachments, isDarkMode]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <div
      className={styles.emailHtmlReset}
      style={{
        color: theme.palette.text.primary,
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Extract initials from email sender name
const getInitials = (name: string) => {
  if (!name) return '?';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0);
  return names[0].charAt(0) + names[names.length - 1].charAt(0);
};

const EmailDetail: React.FC = () => {
  const { emailId } = useParams<{ emailId: string }>();
  const { emails, selectedEmail, setSelectedEmail, updateEmailInContext } = useEmailContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [emailThread, setEmailThread] = useState<Email[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [emailAttachments, setEmailAttachments] = useState<Map<string, Attachment[]>>(new Map());
  const [inlineAttachments, setInlineAttachments] = useState<Map<string, Record<string, InlineAttachment>>>(new Map());
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  // Local read state for icon only
  const [isReadLocal, setIsReadLocal] = useState(selectedEmail?.isRead ?? true);

  // Sync local state when selectedEmail changes
  useEffect(() => {
    setIsReadLocal(selectedEmail?.isRead ?? true);
  }, [selectedEmail?.id, selectedEmail?.isRead]);

  // Remove UNREAD label in local context and Gmail API on open
  useEffect(() => {
    if (selectedEmail && selectedEmail.labelIds.includes('UNREAD')) {
      const updated = {
        ...selectedEmail,
        labelIds: selectedEmail.labelIds.filter(l => l !== 'UNREAD'),
        isRead: true
      };
      // setSelectedEmail(updated); // REMOVE THIS LINE
      updateEmailInContext(updated);
      setIsReadLocal(true);
      markEmailsAsRead([selectedEmail.id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmail?.id]);

  // Extract attachments from emails and update state
  const processEmailAttachments = (emails: Email[]) => {
    const attachmentsMap = new Map<string, Attachment[]>();
    const inlineAttachmentsMap = new Map<string, Record<string, InlineAttachment>>();

    emails.forEach(email => {
      // Process regular attachments
      if (email.hasAttachments && email.gapiMessage.payload) {
        const attachments = extractAttachments(email.gapiMessage.payload);
        if (attachments.length > 0) {
          attachmentsMap.set(email.id, attachments);
        }
      }

      // Process inline images
      if (email.gapiMessage.payload) {
        const inline = extractInlineAttachments(email.id, email.gapiMessage.payload);
        if (Object.keys(inline).length > 0) {
          inlineAttachmentsMap.set(email.id, inline);
        }
      }
    });

    setEmailAttachments(attachmentsMap);
    setInlineAttachments(inlineAttachmentsMap);
  };

  useEffect(() => {
    (async () => {
      if (emailId) {
        setLoading(true);
        try {
          // Find the email by id (do not depend on selectedEmail)
          let email = emails.find(e => e.id === emailId);
          if (!email) {
            // Try to fetch the thread directly if not found in context
            const thread = await getEmailThread(emailId);
            if (thread && thread.length > 0) {
              email = thread.find(e => e.id === emailId);
              setEmailThread(thread);
              processEmailAttachments(thread);
              if (email) {
                setSelectedEmail(email);
                setLoading(false);
                return;
              }
            }
            setError("Email not found");
            setTimeout(() => {
              navigate('/');
            }, 2000);
          } else {
            setSelectedEmail(email);
            // Load the thread
            const thread = await getEmailThread(email.gapiMessage.threadId!);
            setEmailThread(thread);
            processEmailAttachments(thread);
          }
        } catch (error: unknown) {
          setError(`Failed to load email: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.error('Error loading email thread:', error);
        } finally {
          setLoading(false);
        }
      }
    })();
  }, [emailId, setSelectedEmail, navigate]);

  // Mark as read/unread handler
  const handleToggleRead = async () => {
    if (!selectedEmail) return;
    let updated;
    if (!isReadLocal) {
      // Mark as read
      updated = {
        ...selectedEmail,
        labelIds: selectedEmail.labelIds.filter(l => l !== 'UNREAD'),
        isRead: true
      };
      setIsReadLocal(true);
      updateEmailInContext(updated);
      await markEmailsAsRead([selectedEmail.id]);
    } else {
      // Mark as unread
      updated = {
        ...selectedEmail,
        labelIds: [...selectedEmail.labelIds, 'UNREAD'],
        isRead: false
      };
      setIsReadLocal(false);
      updateEmailInContext(updated);
      await markEmailsAsUnread([selectedEmail.id]);
    }
    // Do NOT call setSelectedEmail(updated) here
  };


  if (error) {
    return (
      <Box p={3} display="flex" flexDirection="column" alignItems="center">
        <Typography color="error" variant="h6" gutterBottom>
          {error}
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
        >
          Back to Inbox
        </Button>
      </Box>
    );
  }

  if (loading || !selectedEmail) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Email actions toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Tooltip title="Back to inbox">
          <IconButton onClick={() => navigate('/', { replace: true })}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Archive">
            <IconButton>
              <ArchiveIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete">
            <IconButton>
              <DeleteIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={isReadLocal ? "Mark as unread" : "Mark as read"}>
            <IconButton onClick={handleToggleRead}>
              {isReadLocal ? <MarkEmailReadIcon /> : <MarkEmailUnreadIcon /> }
            </IconButton>
          </Tooltip>

          <Tooltip title="Labels">
            <IconButton>
              <LabelIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="More options">
            <IconButton>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Email content */}
      <div className='email-content'>
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto', // Enable vertical scrolling
            maxHeight: 'calc(100vh - 120px)', // Adjust as needed for your header/toolbars
            p: 2,
            bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f5f5f5'
          }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 2,
              backgroundColor: theme.palette.background.paper
            }}
          >
            {/* Email header */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h5" fontWeight="500">
                  {selectedEmail.subject || '(No subject)'}
                </Typography>
                <Tooltip title={selectedEmail.isStarred ? "Starred" : "Not starred"}>
                  <IconButton>
                    {selectedEmail.isStarred ? <StarIcon color="warning" /> : <StarBorderIcon />}
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Email metadata */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ mr: 2, bgcolor: theme.palette.primary.main }}>
                    {getInitials(selectedEmail.from.split('<')[0].trim())}
                  </Avatar>

                  <Box>
                    <Typography variant="subtitle1" fontWeight="500">
                      {selectedEmail.from.split('<')[0].trim() || 'Unknown Sender'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      To: {selectedEmail.to?.join(', ') || 'me'}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {formatDate(selectedEmail.date)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Email body */}
            <Box sx={{ p: 1 }}>
              <EmailContent
                email={selectedEmail}
                inlineAttachments={inlineAttachments}
                isDarkMode={isDarkMode}
              />
            </Box>

            {/* Display attachments if the selected email has any */}
            {emailAttachments.has(selectedEmail.id) && (
              <AttachmentList
                messageId={selectedEmail.id}
                attachments={emailAttachments.get(selectedEmail.id) || []}
              />
            )}
          </Paper>

          {/* Email thread - if we have more than one message in the thread */}
          {emailThread.length > 1 && (
            <Box>
              <Typography variant="h6" sx={{ px: 2, py: 1 }}>
                {emailThread.length - 1} earlier message{emailThread.length > 2 ? 's' : ''}
              </Typography>

              {emailThread.filter(email => email.id !== selectedEmail.id).map(email => (
                <Paper
                  key={email.id}
                  elevation={0}
                  sx={{
                    p: 3,
                    mb: 2,
                    backgroundColor: theme.palette.background.paper
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: theme.palette.primary.main }}>
                        {getInitials(email.from.split('<')[0].trim())}
                      </Avatar>

                      <Box>
                        <Typography variant="subtitle1" fontWeight="500">
                          {email.from.split('<')[0].trim()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(email.date)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ pl: 7, pt: 1 }}>
                    <EmailContent
                      email={email}
                      inlineAttachments={inlineAttachments}
                      isDarkMode={isDarkMode}
                    />
                  </Box>

                  {/* Display attachments for thread emails */}
                  {emailAttachments.has(email.id) && (
                    <Box sx={{ pl: 7, pr: 2 }}>
                      <AttachmentList
                        messageId={email.id}
                        attachments={emailAttachments.get(email.id) || []}
                      />
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}

          {/* Email reply section */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: theme.palette.background.paper
            }}
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<ReplyIcon />}
                size="medium"
              >
                Reply
              </Button>

              <Button
                variant="outlined"
                startIcon={<ForwardIcon />}
                size="medium"
              >
                Forward
              </Button>
            </Box>
          </Paper>
        </Box>
      </div>
    </Box>
  );
};

export default EmailDetail;