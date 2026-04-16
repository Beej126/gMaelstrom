import React, { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, Download as DownloadIcon } from '@mui/icons-material';
import { Attachment, decodeBase64ToArrayBuffer, decodeBase64ToBytes } from './helpers/emailParser';

interface AttachmentViewerProps {
  open: boolean;
  onClose: () => void;
  attachment: Attachment;
  attachmentData?: string;
  onDownload: () => void;
}

type DragState = {
  pointerOffsetX: number;
  pointerOffsetY: number;
};

export type AttachmentPreviewKind = 'pdf' | 'image' | 'text' | 'unsupported';

const countMatchingBytes = (bytes: Uint8Array, startIndex: number, expectedValue: number): number => {
  let matches = 0;

  for (let index = startIndex; index < bytes.length; index += 2) {
    if (bytes[index] === expectedValue) {
      matches += 1;
    }
  }

  return matches;
};

const stripBom = (text: string): string => text.replace(/^\uFEFF/, '');

const decodeTextAttachment = (bytes: Uint8Array): string => {
  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      return stripBom(new TextDecoder('utf-16le', { fatal: false }).decode(bytes));
    }

    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      return stripBom(new TextDecoder('utf-16be', { fatal: false }).decode(bytes));
    }
  }

  if (bytes.length >= 4) {
    const evenNullRatio = countMatchingBytes(bytes, 0, 0) / Math.ceil(bytes.length / 2);
    const oddNullRatio = countMatchingBytes(bytes, 1, 0) / Math.max(Math.floor(bytes.length / 2), 1);

    if (oddNullRatio > 0.3 && evenNullRatio < 0.1) {
      return stripBom(new TextDecoder('utf-16le', { fatal: false }).decode(bytes));
    }

    if (evenNullRatio > 0.3 && oddNullRatio < 0.1) {
      return stripBom(new TextDecoder('utf-16be', { fatal: false }).decode(bytes));
    }
  }

  return stripBom(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
};

export const getAttachmentPreviewKind = (attachment: Attachment): AttachmentPreviewKind => {
  const mimeType = attachment.mimeType?.toLowerCase() ?? '';
  const fileName = attachment.filename?.toLowerCase() ?? '';

  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'text/plain' || fileName.endsWith('.txt')) return 'text';
  return 'unsupported';
};

const AttachmentViewer: React.FC<AttachmentViewerProps> = ({
  open,
  onClose,
  attachment,
  attachmentData,
  onDownload,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [dialogReady, setDialogReady] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const previewKind = getAttachmentPreviewKind(attachment);

  useEffect(() => {
    if (!open) {
      setDragPosition({ x: 0, y: 0 });
      setDragState(null);
    }
  }, [open]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: MouseEvent) => {
      setDragPosition({
        x: event.clientX - dragState.pointerOffsetX,
        y: event.clientY - dragState.pointerOffsetY,
      });
    };

    const handlePointerUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [dragState]);

  useEffect(() => {
    if (!open) {
      setDialogReady(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !dialogReady) return;

    setLoading(true);
    setError(null);
    setTextContent('');

    setObjectUrl(previousUrl => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });

    if (!attachmentData) {
      return;
    }

    try {
      const bytes = decodeBase64ToBytes(attachmentData);

      if (previewKind === 'pdf') {
        const buffer = decodeBase64ToArrayBuffer(attachmentData);
        const blob = new Blob([buffer], { type: 'application/pdf' });
        setObjectUrl(URL.createObjectURL(blob));
        return;
      }

      if (previewKind === 'image') {
        const buffer = decodeBase64ToArrayBuffer(attachmentData);
        const blob = new Blob([buffer], { type: attachment.mimeType || 'application/octet-stream' });
        setObjectUrl(URL.createObjectURL(blob));
        return;
      }

      if (previewKind === 'text') {
        setTextContent(decodeTextAttachment(bytes));
        setLoading(false);
        return;
      }

      setError('Preview is not available for this file type.');
      setLoading(false);
    } catch (previewError) {
      console.error(`Error initializing ${previewKind} viewer:`, previewError);
      setError('Failed to load preview');
      setLoading(false);
    }
  }, [attachment.mimeType, attachmentData, dialogReady, open, previewKind]);

  useEffect(() => () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }, [objectUrl]);

  const handleTitleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;

    setDragState({
      pointerOffsetX: event.clientX - dragPosition.x,
      pointerOffsetY: event.clientY - dragPosition.y,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="attachment-viewer-title"
      slotProps={{
        transition: {
          onEntered: () => setDialogReady(true),
          onExit: () => setDialogReady(false),
        },
      }}
      sx={{
        '& .MuiDialog-paper': {
          height: '90vh',
          width: 'min(1200px, calc(100vw - 32px))',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 32px)',
          minWidth: 360,
          minHeight: 280,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          resize: 'both',
          transform: `translate(${dragPosition.x}px, ${dragPosition.y}px)`,
        },
      }}
    >
      <DialogTitle
        id="attachment-viewer-title"
        onMouseDown={handleTitleMouseDown}
        sx={{
          m: 0,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          cursor: dragState ? 'grabbing' : 'grab',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              minWidth: 0,
              maxWidth: '100%',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              border: theme => `1px solid ${theme.palette.divider}`,
              color: 'text.primary',
              userSelect: 'text',
            }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                userSelect: 'text',
                cursor: 'text',
              }}
            >
              {attachment.filename}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={onDownload} aria-label="download" sx={{ borderRadius: '4px', p: 1 }}>
            <DownloadIcon />
          </IconButton>
          <IconButton edge="end" onClick={onClose} aria-label="close" size="small" sx={{ borderRadius: '4px', p: 1 }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {loading && dialogReady && previewKind !== 'text' && (
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
              zIndex: 10,
            }}
          >
            <Paper sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, borderRadius: 1 }}>
              <CircularProgress size={30} sx={{ mr: 2 }} />
              <Typography>
                {previewKind === 'image' ? 'Loading image...' : previewKind === 'pdf' ? 'Loading PDF...' : 'Loading preview...'}
              </Typography>
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
        ) : previewKind === 'pdf' && objectUrl ? (
          <Box sx={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
            <iframe
              src={objectUrl}
              title={attachment.filename}
              style={{ border: 'none', width: '100%', height: '100%', maxWidth: '100%', backgroundColor: 'white' }}
              onLoad={() => setLoading(false)}
            />
          </Box>
        ) : previewKind === 'image' && objectUrl ? (
          <Box sx={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, backgroundColor: 'black' }}>
            <Box
              component="img"
              src={objectUrl}
              alt={attachment.filename}
              onLoad={() => setLoading(false)}
              onError={() => {
                setError('Failed to load preview');
                setLoading(false);
              }}
              sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </Box>
        ) : previewKind === 'text' ? (
          <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, minHeight: '100%', backgroundColor: 'background.default' }}>
              <Typography
                component="pre"
                sx={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Consolas, "Courier New", monospace', fontSize: 14, lineHeight: 1.5 }}
              >
                {textContent}
              </Typography>
            </Paper>
          </Box>
        ) : dialogReady ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : null}
        {/*
          The preview content is created only after the dialog transition finishes.
          The embedded browser PDF viewer was reflowing during modal open and
          consistently jumping from page 1 down into page 2. Initializing all
          preview types after `onEntered` keeps the lifecycle uniform and protects
          the PDF path from that layout-timing bug.
        */}
      </DialogContent>
    </Dialog>
  );
};

export default AttachmentViewer;