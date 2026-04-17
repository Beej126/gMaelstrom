import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  IconButton, 
  CircularProgress,
  Paper,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  useTheme
} from '@mui/material';
import { 
  AttachFile as AttachmentIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  InsertDriveFile as GenericFileIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { Attachment, decodeBase64ToArrayBuffer, formatFileSize } from './helpers/emailParser';
import { getApiAttachmentData } from './services/gMailApi';
import AttachmentViewer, { getAttachmentPreviewKind } from './AttachmentViewer';

interface AttachmentListProps {
  messageId: string;
  attachments: Attachment[];
}

interface AttachmentState {
  [id: string]: {
    loading: boolean;
    data?: string;
    downloaded: boolean;
    error?: string;
  };
}

type OpenAttachmentViewerEntry = {
  id: string;
  attachment: Attachment;
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

const AttachmentList: React.FC<AttachmentListProps> = ({ messageId, attachments }) => {
  const theme = useTheme();
  const [attachmentState, setAttachmentState] = useState<AttachmentState>({});
  const [openViewers, setOpenViewers] = useState<OpenAttachmentViewerEntry[]>([]);

  // Skip rendering if no attachments are available
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const canPreview = (attachment: Attachment) => getAttachmentPreviewKind(attachment) !== 'unsupported';

  const handleAttachmentClick = async (attachment: Attachment) => {
    if (canPreview(attachment)) {
      await fetchAttachmentData(attachment);
      setOpenViewers(previous => ([
        ...previous,
        {
          id: `${attachment.id}:${Date.now()}`,
          attachment,
          initialPosition: {
            x: 24 * previous.length,
            y: 24 * previous.length,
          },
        },
      ]));
    } else {
      void handleDownload(attachment);
    }
  };

  const fetchAttachmentData = async (attachment: Attachment): Promise<string | undefined> => {
    // If we already have the data, use it
    if (attachmentState[attachment.id]?.data) {
      return attachmentState[attachment.id].data;
    }

    // If attachment data is already in the attachment object, use it
    if (attachment.data) {
      setAttachmentState(prev => ({
        ...prev,
        [attachment.id]: {
          loading: false,
          downloaded: true,
          data: attachment.data
        }
      }));
      return attachment.data;
    }

    // Otherwise, need to fetch it from the API
    if (!attachment.attachmentId) {
      setAttachmentState(prev => ({
        ...prev,
        [attachment.id]: {
          loading: false,
          downloaded: false,
          error: 'No attachment ID available'
        }
      }));
      return undefined;
    }

    // Set loading state
    setAttachmentState(prev => ({
      ...prev,
      [attachment.id]: {
        loading: true,
        downloaded: false
      }
    }));

    try {
      // Fetch attachment data
      const data = await getApiAttachmentData(messageId, attachment.attachmentId);
      
      // Store the data and update state
      setAttachmentState(prev => ({
        ...prev,
        [attachment.id]: {
          loading: false,
          data,
          downloaded: true
        }
      }));
      
      return data;
    } catch (error) {
      console.error('Error downloading attachment:', error);
      setAttachmentState(prev => ({
        ...prev,
        [attachment.id]: {
          loading: false,
          downloaded: false,
          error: 'Failed to download attachment'
        }
      }));
      return undefined;
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    const data = await fetchAttachmentData(attachment);
    if (data) {
      downloadAttachment(attachment, data);
    }
  };

  const downloadAttachment = (attachment: Attachment, base64Data: string) => {
    // Create blob from base64
    const buffer = decodeBase64ToArrayBuffer(base64Data);
    const blob = new Blob([buffer], { type: attachment.mimeType || 'application/octet-stream' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.filename;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  };

  const handleCloseViewer = (viewerId: string) => {
    setOpenViewers(previous => previous.filter(viewer => viewer.id !== viewerId));
  };

  const handleActivateViewer = (viewerId: string) => {
    setOpenViewers(previous => bringViewerToFront(previous, viewerId));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon color="primary" />;
    } else if (mimeType === 'application/pdf') {
      return <PdfIcon color="error" />;
    } else if (mimeType.includes('document') || mimeType.includes('msword') || 
               mimeType.includes('wordprocessing')) {
      return <DocumentIcon color="primary" />;
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return <DocumentIcon color="success" />;
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return <DocumentIcon color="warning" />;
    } else {
      return <GenericFileIcon />;
    }
  };

  return (
    <>
      <Paper 
        elevation={0} 
        sx={{ 
          mt: 2, 
          p: 2, 
          borderTop: `1px solid grey`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <AttachmentIcon sx={{ mr: 1 }} color="action" />
          <Typography variant="subtitle1" component="h3" fontWeight={500}>
            {attachments.length} Attachment{attachments.length > 1 ? 's' : ''}
          </Typography>
        </Box>
        <List dense>
          {attachments.map((attachment) => {
            const state = attachmentState[attachment.id];
            const isLoading = state?.loading || false;
            const previewable = canPreview(attachment);
            
            return (
              <ListItem 
                key={attachment.id}
                sx={{ 
                  borderRadius: 1,
                  cursor: previewable ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  }
                }}
                onClick={previewable ? () => handleAttachmentClick(attachment) : undefined}
              >
                <ListItemIcon>
                  {getFileIcon(attachment.mimeType)}
                </ListItemIcon>
                <ListItemText 
                  primary={attachment.filename} 
                  secondary={formatFileSize(attachment.size)} 
                  primaryTypographyProps={{
                    style: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }
                  }}
                />
                <ListItemSecondaryAction>
                  {previewable && (
                    <IconButton 
                      edge="end" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAttachmentClick(attachment);
                      }}
                      disabled={isLoading}
                      size="small"
                      sx={{ mr: 1 }}
                      title="Open preview"
                    >
                      {isLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <ViewIcon />
                      )}
                    </IconButton>
                  )}
                  <IconButton 
                    edge="end" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(attachment);
                    }}
                    disabled={isLoading}
                    size="small"
                    title="Download"
                  >
                    {isLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      <DownloadIcon />
                    )}
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* PDF Viewer Modal */}
      {openViewers.map(viewer => (
        <AttachmentViewer
          key={viewer.id}
          open={true}
          onClose={() => handleCloseViewer(viewer.id)}
          onActivate={() => handleActivateViewer(viewer.id)}
          attachment={viewer.attachment}
          attachmentData={attachmentState[viewer.attachment.id]?.data}
          onDownload={() => void handleDownload(viewer.attachment)}
          initialPosition={viewer.initialPosition}
          zIndex={1300 + openViewers.findIndex(openViewer => openViewer.id === viewer.id)}
        />
      ))}
    </>
  );
};

export default AttachmentList;