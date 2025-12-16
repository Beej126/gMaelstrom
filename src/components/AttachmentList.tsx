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
  useTheme,
  Tooltip
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
import { Attachment, formatFileSize } from '../helpers/emailParser';
import { getAttachmentData } from '../app/gmailApi';
import PdfViewer from './PdfViewer';

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

const AttachmentList: React.FC<AttachmentListProps> = ({ messageId, attachments }) => {
  const theme = useTheme();
  const [attachmentState, setAttachmentState] = useState<AttachmentState>({});
  const [viewingPdf, setViewingPdf] = useState<Attachment | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Skip rendering if no attachments are available
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const isPdf = (attachment: Attachment) => {
    return attachment.mimeType === 'application/pdf';
  };

  const handleAttachmentClick = async (attachment: Attachment) => {
    if (isPdf(attachment)) {
      // For PDFs, fetch data and open the viewer
      await fetchAttachmentData(attachment);
      setViewingPdf(attachment);
      setViewerOpen(true);
    } else {
      // For other file types, download directly
      handleDownload(attachment);
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
      const data = await getAttachmentData(messageId, attachment.attachmentId);
      
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
    const binary = atob(base64Data.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: attachment.mimeType || 'application/octet-stream' });
    
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

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setViewingPdf(null);
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
          backgroundColor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`
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
            const isPdfFile = isPdf(attachment);
            
            return (
              <ListItem 
                key={attachment.id}
                sx={{ 
                  borderRadius: 1,
                  cursor: isPdfFile ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  }
                }}
                onClick={isPdfFile ? () => handleAttachmentClick(attachment) : undefined}
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
                  {isPdfFile && (
                    <Tooltip title="View PDF">
                      <IconButton 
                        edge="end" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAttachmentClick(attachment);
                        }}
                        disabled={isLoading}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        {isLoading ? (
                          <CircularProgress size={20} />
                        ) : (
                          <ViewIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Download">
                    <IconButton 
                      edge="end" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(attachment);
                      }}
                      disabled={isLoading}
                      size="small"
                    >
                      {isLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <DownloadIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* PDF Viewer Modal */}
      {viewingPdf && (
        <PdfViewer
          open={viewerOpen}
          onClose={handleCloseViewer}
          attachment={viewingPdf}
          attachmentData={attachmentState[viewingPdf.id]?.data}
          onDownload={() => handleDownload(viewingPdf)}
        />
      )}
    </>
  );
};

export default AttachmentList;