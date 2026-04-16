import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ReplyIcon from '@mui/icons-material/Reply';
import ForwardIcon from '@mui/icons-material/Forward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AttachmentViewer, { getAttachmentPreviewKind } from './AttachmentViewer';
import styles from './EmailDetail.module.scss';
import { useDataCache } from './services/ctxDataCache';
import {
  Attachment,
  extractHtmlContent,
  formatFileSize,
  getDate,
  getFrom,
  getSubject,
  getTo,
  InlineAttachment,
  isRead,
  processEmailContentForDarkMode,
  replaceInlineAttachments,
  splitQuotedEmailContent,
  decodeBase64ToArrayBuffer,
} from './helpers/emailParser';
import { getApiAttachmentData, GMessage, markApiThreadAsRead } from './services/gMailApi';

interface EmailContentProps {
  email: GMessage;
  inlineAttachments: Map<string, Record<string, InlineAttachment>>;
  isDarkMode: boolean;
}

type ThreadAttachment = Attachment & {
  messageId: string;
  key: string;
};

type AttachmentState = {
  loading: boolean;
  data?: string;
  downloaded: boolean;
  error?: string;
};

type OpenThreadAttachmentViewer = {
  id: string;
  attachment: ThreadAttachment;
  initialPosition: { x: number; y: number };
};

const bringViewerToFront = <T extends { id: string }>(viewers: T[], viewerId: string): T[] => {
  const viewerIndex = viewers.findIndex(viewer => viewer.id === viewerId);
  if (viewerIndex < 0 || viewerIndex === viewers.length - 1) return viewers;

  const nextViewers = [...viewers];
  const [viewer] = nextViewers.splice(viewerIndex, 1);
  nextViewers.push(viewer);
  return nextViewers;
};

interface AttachmentChipRowProps {
  attachments: ThreadAttachment[];
  onAttachmentClick: (attachment: ThreadAttachment) => Promise<void>;
  attachmentState: Record<string, AttachmentState>;
  getAttachmentIcon: (mimeType: string) => React.ReactNode;
  theme: Theme;
  label: string;
}

const EmailContent: React.FC<EmailContentProps> = ({ email, inlineAttachments, isDarkMode }) => {
  const [content, setContent] = useState<string>('');
  const [quotedContent, setQuotedContent] = useState<string>('');
  const [hasQuotedContent, setHasQuotedContent] = useState(false);
  const [showQuotedContent, setShowQuotedContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    const processEmailContent = async () => {
      setLoading(true);

      try {
        let htmlContent = extractHtmlContent(email.payload!);
        if (!htmlContent && email.snippet) {
          htmlContent = `<p>${email.snippet}...</p><p><i>(Full message content not available)</i></p>`;
        }

        if (!htmlContent) htmlContent = '<p>No content available</p>';

        if (email.id && inlineAttachments.has(email.id)) {
          htmlContent = await replaceInlineAttachments(
            htmlContent,
            inlineAttachments.get(email.id) || {},
            getApiAttachmentData
          );
        }

        const processedContent = processEmailContentForDarkMode(htmlContent, isDarkMode);
        const splitContent = splitQuotedEmailContent(processedContent);

        setContent(splitContent.visibleHtml || processedContent);
        setQuotedContent(splitContent.quotedHtml);
        setHasQuotedContent(splitContent.hasQuotedContent);
      } catch (error) {
        console.error(`Error processing email content for ${email.id}:`, error);
        setContent('<p>Error loading content</p>');
        setQuotedContent('');
        setHasQuotedContent(false);
      } finally {
        setLoading(false);
      }
    };

    processEmailContent();
  }, [email.id, email.payload, email.snippet, inlineAttachments, isDarkMode]);

  useEffect(() => {
    setShowQuotedContent(false);
  }, [email.id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      <div
        className={styles.emailHtmlReset}
        style={{
          color: theme.palette.text.primary,
          ['--email-link-color' as string]: isDarkMode ? theme.palette.primary.light : theme.palette.primary.main,
          ['--email-link-hover-color' as string]: isDarkMode ? theme.palette.primary.main : theme.palette.primary.dark,
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {hasQuotedContent && quotedContent && (
        <Box sx={{ mt: 1.5 }}>
          <Chip
            clickable
            label="..."
            onClick={() => setShowQuotedContent(previous => !previous)}
            size="small"
            variant="outlined"
            title={showQuotedContent ? 'Hide previous thread content' : 'Show previous thread content'}
            aria-label={showQuotedContent ? 'Hide previous thread content' : 'Show previous thread content'}
            sx={{
              height: 13,
              borderRadius: 999,
              backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
              fontWeight: 700,
              letterSpacing: '0.08em',
              '& .MuiChip-label': {
                display: 'flex',
                alignItems: 'center',
                paddingTop: 0,
                paddingBottom: 0.75,
                fontWeight: 800,
                lineHeight: 1,
              },
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
              },
            }}
          />

          {showQuotedContent && (
            <Box
              sx={{
                mt: 1.5,
                pt: 1.5,
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              <div
                className={styles.emailHtmlReset}
                style={{
                  color: theme.palette.text.primary,
                  ['--email-link-color' as string]: isDarkMode ? theme.palette.primary.light : theme.palette.primary.main,
                  ['--email-link-hover-color' as string]: isDarkMode ? theme.palette.primary.main : theme.palette.primary.dark,
                }}
                dangerouslySetInnerHTML={{ __html: quotedContent }}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

const formatDate = (date: Date) => new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(date);

const getInitials = (name: string) => {
  if (!name) return '?';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0);
  return names[0].charAt(0) + names[names.length - 1].charAt(0);
};

const applyReadState = (message: GMessage, asRead: boolean): GMessage => ({
  ...message,
  labelIds: asRead
    ? (message.labelIds ?? []).filter(labelId => labelId !== 'UNREAD')
    : Array.from(new Set([...(message.labelIds ?? []), 'UNREAD'])),
});

const getAttachmentIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon fontSize="small" color="primary" />;
  if (mimeType === 'application/pdf') return <PictureAsPdfIcon fontSize="small" color="error" />;
  if (mimeType.includes('document') || mimeType.includes('msword') || mimeType.includes('wordprocessing')) {
    return <DescriptionIcon fontSize="small" color="primary" />;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <DescriptionIcon fontSize="small" color="success" />;
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return <DescriptionIcon fontSize="small" color="warning" />;
  }
  return <InsertDriveFileIcon fontSize="small" color="action" />;
};

const AttachmentChipRow: React.FC<AttachmentChipRowProps> = ({
  attachments,
  onAttachmentClick,
  attachmentState,
  getAttachmentIcon,
  theme,
  label,
}) => {
  if (!attachments.length) return null;

  const getAttachmentActionLabel = (attachment: ThreadAttachment) =>
    getAttachmentPreviewKind(attachment) === 'unsupported' ? 'download file' : 'open preview';

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mr: 0.5 }}>
        <AttachFileIcon fontSize="small" color="action" />
        <Typography variant="subtitle2" fontWeight={600}>
          {label}
        </Typography>
      </Box>

      {attachments.map(attachment => (
        <Tooltip
          key={attachment.key}
          title={`${attachment.filename} (${formatFileSize(attachment.size)}) - ${getAttachmentActionLabel(attachment)}`}
        >
          <Box
            component="button"
            type="button"
            onClick={() => void onAttachmentClick(attachment)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              maxWidth: '100%',
              px: 1,
              py: 0.75,
              borderRadius: 999,
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.action.hover,
              cursor: 'pointer',
              textAlign: 'left',
              appearance: 'none',
              font: 'inherit',
              color: 'inherit',
              transition: 'background-color 120ms ease, border-color 120ms ease',
              '&:hover': {
                backgroundColor: theme.palette.action.selected,
              },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            }}
          >
            <Box sx={{ position: 'relative', display: 'inline-flex', mr: 0.25 }}>
              {getAttachmentIcon(attachment.mimeType)}
              <Box
                sx={{
                  position: 'absolute',
                  right: -5,
                  bottom: -5,
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.secondary,
                  boxShadow: theme.shadows[1],
                }}
              >
                {attachmentState[attachment.key]?.loading ? (
                  <CircularProgress size={8} thickness={7} />
                ) : getAttachmentPreviewKind(attachment) !== 'unsupported' ? (
                  <VisibilityIcon sx={{ fontSize: 8 }} />
                ) : (
                  <DownloadIcon sx={{ fontSize: 8 }} />
                )}
              </Box>
            </Box>
            <Typography
              variant="body2"
              sx={{
                maxWidth: { xs: 180, sm: 220, md: 280 },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 500,
              }}
            >
              {attachment.filename}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
};

const ThreadDetail: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const { getCachedThreadMessages, inlineAttachments, messageAttachments, updatePageThread } = useDataCache();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<GMessage[]>([]);
  const [attachmentState, setAttachmentState] = useState<Record<string, AttachmentState>>({});
  const [openViewers, setOpenViewers] = useState<OpenThreadAttachmentViewer[]>([]);
  const autoMarkedThreadIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      if (!threadId) return;

      setLoading(true);
      setError(null);
      try {
        const messages = await getCachedThreadMessages(threadId);
        setThreadMessages(messages);
      } catch (threadError: unknown) {
        setError(`Failed to load thread: ${threadError instanceof Error ? threadError.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [getCachedThreadMessages, threadId]);

  const orderedMessages = useMemo(() => [...threadMessages].sort((left, right) => {
    const leftDate = Date.parse(getDate(left) || '') || 0;
    const rightDate = Date.parse(getDate(right) || '') || 0;
    return leftDate - rightDate;
  }), [threadMessages]);

  const threadAttachments = useMemo<ThreadAttachment[]>(() => orderedMessages.flatMap(message => {
    if (!message.id) return [];

    return (messageAttachments.get(message.id) ?? []).map((attachment, index) => ({
      ...attachment,
      messageId: message.id,
      key: `${message.id}:${attachment.id}:${index}`,
    }));
  }), [messageAttachments, orderedMessages]);

  const latestMessage = orderedMessages.length ? orderedMessages[orderedMessages.length - 1] : null;
  const isThreadRead = orderedMessages.every(message => isRead(message));

  const applyThreadReadState = useCallback((asRead: boolean) => {
    setThreadMessages(prev => prev.map(message => applyReadState(message, asRead)));
    updatePageThread(threadId!, {
      hasUnread: !asRead,
      latestMessage: latestMessage ? applyReadState(latestMessage, asRead) : latestMessage ?? undefined,
    });
  }, [latestMessage, threadId, updatePageThread]);

  useEffect(() => {
    if (!threadId) return;
    autoMarkedThreadIds.current.delete(threadId);
  }, [threadId]);

  useEffect(() => {
    if (!threadId || !orderedMessages.length || isThreadRead || autoMarkedThreadIds.current.has(threadId)) return;

    autoMarkedThreadIds.current.add(threadId);
    applyThreadReadState(true);
    void markApiThreadAsRead(threadId, true);
  }, [applyThreadReadState, isThreadRead, orderedMessages.length, threadId]);

  const fetchAttachmentData = useCallback(async (attachment: ThreadAttachment): Promise<string | undefined> => {
    if (attachmentState[attachment.key]?.data) return attachmentState[attachment.key].data;

    if (attachment.data) {
      setAttachmentState(prev => ({
        ...prev,
        [attachment.key]: {
          loading: false,
          downloaded: true,
          data: attachment.data,
        },
      }));
      return attachment.data;
    }

    if (!attachment.attachmentId) {
      setAttachmentState(prev => ({
        ...prev,
        [attachment.key]: {
          loading: false,
          downloaded: false,
          error: 'No attachment ID available',
        },
      }));
      return undefined;
    }

    setAttachmentState(prev => ({
      ...prev,
      [attachment.key]: {
        loading: true,
        downloaded: false,
      },
    }));

    try {
      const data = await getApiAttachmentData(attachment.messageId, attachment.attachmentId);
      setAttachmentState(prev => ({
        ...prev,
        [attachment.key]: {
          loading: false,
          data,
          downloaded: true,
        },
      }));
      return data;
    } catch (attachmentError) {
      console.error('Error downloading attachment:', attachmentError);
      setAttachmentState(prev => ({
        ...prev,
        [attachment.key]: {
          loading: false,
          downloaded: false,
          error: 'Failed to download attachment',
        },
      }));
      return undefined;
    }
  }, [attachmentState]);

  const downloadAttachment = useCallback((attachment: ThreadAttachment, base64Data: string) => {
    const buffer = decodeBase64ToArrayBuffer(base64Data);
    const blob = new Blob([buffer], { type: attachment.mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  }, []);

  const handleDownload = useCallback(async (attachment: ThreadAttachment) => {
    const data = await fetchAttachmentData(attachment);
    if (data) downloadAttachment(attachment, data);
  }, [downloadAttachment, fetchAttachmentData]);

  const handleThreadAttachmentClick = useCallback(async (attachment: ThreadAttachment) => {
    if (getAttachmentPreviewKind(attachment) !== 'unsupported') {
      await fetchAttachmentData(attachment);
      setOpenViewers(previous => ([
        ...previous,
        {
          id: `${attachment.key}:${Date.now()}`,
          attachment,
          initialPosition: {
            x: 24 * previous.length,
            y: 24 * previous.length,
          },
        },
      ]));
      return;
    }

    await handleDownload(attachment);
  }, [fetchAttachmentData, handleDownload]);

  const handleCloseViewer = useCallback((viewerId: string) => {
    setOpenViewers(previous => previous.filter(viewer => viewer.id !== viewerId));
  }, []);

  const handleActivateViewer = useCallback((viewerId: string) => {
    setOpenViewers(previous => bringViewerToFront(previous, viewerId));
  }, []);

  const handleToggleRead = async () => {
    if (!threadId || !orderedMessages.length) return;

    const markAsRead = !isThreadRead;
    await markApiThreadAsRead(threadId, markAsRead);
    applyThreadReadState(markAsRead);
  };

  if (error) {
    return (
      <Box p={3} display="flex" flexDirection="column" alignItems="center">
        <Typography color="error" variant="h6" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate('/?mode=threads')}>
          Back to Threads
        </Button>
      </Box>
    );
  }

  if (loading || !latestMessage) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Paper
        elevation={0}
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Tooltip title="Back to threads">
          <IconButton onClick={() => navigate('/?mode=threads', { replace: true })}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={isThreadRead ? 'Mark thread as unread' : 'Mark thread as read'}>
          <IconButton onClick={handleToggleRead}>
            {isThreadRead ? <MarkEmailReadIcon /> : <MarkEmailUnreadIcon />}
          </IconButton>
        </Tooltip>
      </Paper>

      <div className="email-list-container">
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 120px)',
            p: 2,
            bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#f5f5f5',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 1,
              mb: 2,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Typography variant="h5" fontWeight="600">
              {getSubject(latestMessage) || '(No subject)'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {orderedMessages.length} message{orderedMessages.length === 1 ? '' : 's'} in this thread
            </Typography>

            {!!threadAttachments.length && (
              <Box sx={{ mt: 2.25 }}>
                <AttachmentChipRow
                  attachments={threadAttachments}
                  onAttachmentClick={handleThreadAttachmentClick}
                  attachmentState={attachmentState}
                  getAttachmentIcon={getAttachmentIcon}
                  theme={theme}
                  label={`${threadAttachments.length} attachment${threadAttachments.length === 1 ? '' : 's'} across this thread`}
                />
              </Box>
            )}
          </Paper>

          {orderedMessages.map(message => {
            const unread = !isRead(message);
            const senderName = getFrom(message).split('<')[0].trim() || 'Unknown Sender';
            const messageDate = getDate(message);
            const attachments = message.id ? messageAttachments.get(message.id) as Attachment[] | undefined : undefined;
            const messageAttachmentChips: ThreadAttachment[] = message.id
              ? (attachments ?? []).map((attachment, index) => ({
                  ...attachment,
                  messageId: message.id!,
                  key: `${message.id}:${attachment.id}:${index}`,
                }))
              : [];

            return (
              <Paper
                key={message.id}
                elevation={0}
                sx={{
                  p: 1,
                  mb: 2,
                  borderLeft: unread ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: theme.palette.primary.main }}>
                        {getInitials(senderName)}
                      </Avatar>

                      <Box>
                        <Typography variant="subtitle1" fontWeight={unread ? 800 : 500}>
                          {senderName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight={unread ? 600 : 400}>
                          To: {getTo(message).join(', ') || 'me'}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" fontWeight={unread ? 600 : 400}>
                      {messageDate ? formatDate(new Date(messageDate)) : ''}
                    </Typography>
                  </Box>

                  <Typography variant="body1" fontWeight={unread ? 700 : 500}>
                    {getSubject(message) || '(No subject)'}
                  </Typography>

                  {!!messageAttachmentChips.length && (
                    <Box sx={{ mt: 1.25 }}>
                      <AttachmentChipRow
                        attachments={messageAttachmentChips}
                        onAttachmentClick={handleThreadAttachmentClick}
                        attachmentState={attachmentState}
                        getAttachmentIcon={getAttachmentIcon}
                        theme={theme}
                        label={`${messageAttachmentChips.length} attachment${messageAttachmentChips.length === 1 ? '' : 's'}`}
                      />
                    </Box>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <EmailContent
                  email={message}
                  inlineAttachments={inlineAttachments}
                  isDarkMode={isDarkMode}
                />

              </Paper>
            );
          })}

          <Paper
            elevation={0}
            sx={{
              p: 1,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" startIcon={<ReplyIcon />} size="medium">
                Reply
              </Button>

              <Button variant="outlined" startIcon={<ForwardIcon />} size="medium">
                Forward
              </Button>
            </Box>
          </Paper>

          {openViewers.map(viewer => (
            <AttachmentViewer
              key={viewer.id}
              open={true}
              onClose={() => handleCloseViewer(viewer.id)}
              onActivate={() => handleActivateViewer(viewer.id)}
              attachment={viewer.attachment}
              attachmentData={attachmentState[viewer.attachment.key]?.data}
              onDownload={() => void handleDownload(viewer.attachment)}
              initialPosition={viewer.initialPosition}
              zIndex={1300 + openViewers.findIndex(openViewer => openViewer.id === viewer.id)}
            />
          ))}
        </Box>
      </div>
    </Box>
  );
};

export default ThreadDetail;