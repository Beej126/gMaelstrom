import React, { useEffect, useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  IconButton, 
  Typography, 
  Box,
  CircularProgress,
  useTheme,
  Paper
} from '@mui/material';
import { Close as CloseIcon} from '@mui/icons-material';
import { Attachment } from './helpers/emailParser';

interface PdfViewerProps {
  open: boolean;
  onClose: () => void;
  attachment: Attachment;
  attachmentData?: string;
  onDownload: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ 
  open, 
  onClose, 
  attachment, 
  attachmentData
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);

  // Create or recreate the blob URL when the component opens or attachmentData changes
  useEffect(() => {
    if (open && attachmentData) {
      setLoading(true);
      setError(null);
      
      try {
        // Reset scale when opening a new PDF
        setScale(1.0);
        
        // Clean up old URL if it exists
        if (pdfObjectUrl) {
          URL.revokeObjectURL(pdfObjectUrl);
        }
        
        // Convert base64 to binary
        const binary = atob(attachmentData.replace(/-/g, '+').replace(/_/g, '/'));
        // Create array buffer
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        // Create blob and URL
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const newUrl = URL.createObjectURL(blob);
        setPdfObjectUrl(newUrl);
      } catch (error) {
        console.error('Error initializing PDF viewer:', error);
        setError('Failed to load PDF viewer');
        setLoading(false);
      }
    }
  }, [open, attachmentData]);

  // Handle iframe load event
  const handleIframeLoad = () => {
    setLoading(false);
  };

  // Handle zoom in
  // const handleZoomIn = () => {
  //   setScale(prev => Math.min(prev + 0.2, 2.5));
  // };

  // // Handle zoom out
  // const handleZoomOut = () => {
  //   setScale(prev => Math.max(prev - 0.2, 0.5));
  // };

  // Clean up created URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfObjectUrl) {
        URL.revokeObjectURL(pdfObjectUrl);
        setPdfObjectUrl(null);
      }
    };
  }, []);

  // Handle modal close - clear URL
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog 
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="pdf-viewer-title"
      sx={{
        '& .MuiDialog-paper': {
          height: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle id="pdf-viewer-title" sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
          {attachment.filename}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* <IconButton
            size="small"
            onClick={handleZoomOut}
            aria-label="zoom out"
            sx={{ borderRadius: '4px', p: 1 }}
          >
            <ZoomOut />
          </IconButton>
          <Typography variant="body2" sx={{ mx: 1 }}>
            {Math.round(scale * 100)}%
          </Typography>
          <IconButton
            size="small"
            onClick={handleZoomIn}
            aria-label="zoom in"
            sx={{ borderRadius: '4px', p: 1 }}
          >
            <ZoomIn />
          </IconButton>
          <IconButton
            onClick={onDownload}
            aria-label="download"
            size="small"
            sx={{ borderRadius: '4px', p: 1 }}
          >
            <DownloadIcon />
          </IconButton> */}
          <IconButton
            edge="end"
            onClick={handleClose}
            aria-label="close"
            size="small"
            sx={{ borderRadius: '4px', p: 1 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent 
        sx={{ 
          p: 0, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: theme.palette.mode === 'dark' ? '#202124' : '#f5f5f5',
          position: 'relative'
        }}
      >
        {loading && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              zIndex: 10
            }}
          >
            <Paper 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                p: 2, 
                borderRadius: 1,
                boxShadow: theme.shadows[4]
              }}
            >
              <CircularProgress size={30} sx={{ mr: 2 }} />
              <Typography>Loading PDF...</Typography>
            </Paper>
          </Box>
        )}

        {error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" variant="h6">
              {error}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Please try downloading the file instead.
            </Typography>
          </Box>
        ) : pdfObjectUrl ? (
          <Box 
            sx={{ 
              width: '100%', 
              height: '100%', 
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <iframe
              ref={iframeRef}
              src={pdfObjectUrl}
              title={attachment.filename}
              style={{ 
                border: 'none', 
                width: `${100 * scale}%`, 
                height: '100%',
                maxWidth: '100%',
                backgroundColor: 'white' 
              }}
              onLoad={handleIframeLoad}
            />
          </Box>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PdfViewer;