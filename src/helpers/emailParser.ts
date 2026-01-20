import { GMessage } from "../services/gMailApi";
import type { gmail_v1 } from "googleapis"; //be SUPER CAREFUL to import only types ... without "type" it could severly expand the runtime bundle size!!

// Extract the 'From' field from a Gmail message
export const getFrom = (message?: GMessage | null): string => {
  if (!message) return '';
  const headers = message.payload?.headers || [];
  const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from');
  if (!fromHeader?.value) return '';

  // Extract the display name (pretty portion) before <...>
  // Example: '"John Doe" <john@example.com>' => John Doe
  // Example: 'John Doe <john@example.com>' => John Doe
  // Example: 'john@example.com' => john@example.com
  const match = fromHeader.value.match(/^["' ]*(.*?)["' ]*(<.*>)$/);
  return match && match[1] ? match[1].trim() : fromHeader.value.trim();
};

// Extract the 'To' field from a Gmail message
export const getTo = (message: GMessage): string[] => {
  const headers = message.payload?.headers || [];
  const toHeader = headers.find(h => h.name?.toLowerCase() === 'to');
  if (!toHeader?.value) return [];
  // Split by comma and trim
  return toHeader.value.split(',').map(addr => addr.trim());
};

// Extract the 'Subject' field from a Gmail message
export const getSubject = (message?: GMessage | null): string => {
  if (!message) return '';
  const headers = message.payload?.headers || [];
  const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject');
  return subjectHeader?.value || '';
};

// Extract the date from a Gmail message (as ISO string)
export const getDate = (message?: GMessage | null): string => {
  if (!message) return '';
  const headers = message.payload?.headers || [];
  const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date');
  if (!dateHeader?.value) return '';
  // Try to parse the date string
  const date = new Date(dateHeader.value);
  return isNaN(date.getTime()) ? '' : date.toISOString();
};

// Check if a Gmail message is read
export const isRead = (message?: GMessage | null): boolean => {
  if (!message) return true;
  return !(message.labelIds || []).includes('UNREAD');
};

// Check if a Gmail message is starred
export const isStarred = (message: GMessage): boolean => {
  return (message.labelIds || []).includes('STARRED');
};


// Helper function to decode base64 content
export const decodeBase64 = (data: string): string => {
  if (!data) return '';
  
  // Replace URL-safe characters
  const sanitized = data.replace(/-/g, '+').replace(/_/g, '/');
  // Handle padding
  const padding = '='.repeat((4 - sanitized.length % 4) % 4);
  const base64 = sanitized + padding;
  
  try {
    // First attempt: try to decode as UTF-8
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    try {
      // Second attempt: decode directly
      const decoded = atob(base64);
      
      // Check for charset specification in the content
      const charsetMatch = decoded.match(/charset=["']?([^"'>\s]+)/i);
      if (charsetMatch && charsetMatch[1].toLowerCase() !== 'utf-8') {
        console.info(`Detected charset: ${charsetMatch[1]}, using fallback decoding`);
        
        // For known charsets, we could add special handling here
        // Currently we'll just return the decoded string as-is
      }
      
      // Check for HTML content indicators
      const isHtml = decoded.includes('<html') || decoded.includes('<body') || 
                     decoded.includes('<div') || decoded.includes('<span') ||
                     decoded.includes('<p>') || decoded.includes('<table');
      
      // For HTML content, do minimal processing
      if (isHtml) {
        // Handle potential UTF-8 BOM (Byte Order Mark)
        if (decoded.charCodeAt(0) === 0xFEFF) {
          return decoded.substring(1);
        }
        return decoded;
      }
      
      // For plain text, handle line breaks and ensure proper display
      return decoded.replace(/\r\n|\r|\n/g, '<br/>');
    } catch (e2) {
      console.error('Failed to decode base64 content:', e2);
      return 'Content could not be decoded properly';
    }
  }
};

// Helper function to sanitize HTML content for safe rendering
export const sanitizeHtmlContent = (html: string): string => {
  if (!html) return '';

  // Remove potentially dangerous script tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Fix meta tag content attributes: replace ';' with ',' for key-value pairs and remove empty pairs
  sanitized = sanitized.replace(/(<meta[^>]*content=["'])([^"'>]+)(["'][^>]*>)/gi, (_unused, p1, p2, p3) => {
    let parts = p2.split(/[,;]/).map((part: string) => part.trim());
    // Remove empty key-value pairs (e.g., width=; or =value)
    parts = parts.filter((part: string) => {
      if (!part) return false;
      const [key, value] = part.split('=');
      if (!key || !key.trim()) return false;
      if (value !== undefined && !value.trim()) return false;
      return true;
    });
    const fixed = parts.join(', ');
    return p1 + fixed + p3;
  });

  // Handle mailto: links to open in a new tab
  sanitized = sanitized.replace(
    /href=["']mailto:([^"']+)["']/gi,
    'href="mailto:$1" rel="noopener noreferrer"'
  );

  // Handle external links to open in a new tab
  sanitized = sanitized.replace(
    /href=["'](http[s]?:\/\/[^"']+)["']/gi,
    'href="$1" target="_blank" rel="noopener noreferrer"'
  );

  // Don't replace CID references with placeholders here
  // They should be replaced with actual image data using replaceInlineAttachments
  
  return sanitized;
};

// Process email content for dark mode compatibility
export const processEmailContentForDarkMode = (htmlContent: string, isDarkMode: boolean): string => {
  if (!isDarkMode || !htmlContent) return htmlContent;
  
  // Create a temporary DOM element to manipulate the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Process all elements to remove color styling
  const processNode = (node: HTMLElement) => {
    // Remove inline color styles
    if (node.style) {
      node.style.removeProperty('color');
      node.style.removeProperty('background-color');
      node.style.removeProperty('background');
    }
    
    // Remove color attributes
    node.removeAttribute('bgcolor');
    node.removeAttribute('color');
    
    // Remove classes that might contain color information
    const classesToRemove = ['highlight', 'bg-', 'text-color-'];
    classesToRemove.forEach(className => {
      if (node.className.includes(className)) {
        node.className = node.className
          .split(' ')
          .filter(cls => !cls.includes(className))
          .join(' ');
      }
    });
    
    // Process all child elements recursively
    Array.from(node.children).forEach(child => processNode(child as HTMLElement));
  };
  
  Array.from(tempDiv.children).forEach(node => processNode(node as HTMLElement));
  
  // Remove any <style> tags that might contain color definitions
  const styleTags = tempDiv.querySelectorAll('style');
  styleTags.forEach(styleTag => {
    styleTag.textContent = styleTag.textContent?.replace(/color:.*?;/gi, '')
      .replace(/background(-color)?:.*?;/gi, '') ?? null;
  });
  
  return tempDiv.innerHTML;
}

// Helper function to extract HTML content from a Gmail message or message part
export const extractHtmlContent = (item: GMessage | gmail_v1.Schema$MessagePart): string => {
  const payload = (item as GMessage).payload ? (item as GMessage).payload : (item as gmail_v1.Schema$MessagePart);
  // Check if the payload has a simple body
  if (payload && payload.body && payload.body.data) {
    return sanitizeHtmlContent(decodeBase64(payload.body.data));
  }
  // Check for multipart content
  if (payload && payload.parts) {
    // First try to find HTML part
    const htmlPart = payload.parts.find((part: gmail_v1.Schema$MessagePart) => part.mimeType === 'text/html' && part.body && part.body.data);
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      return sanitizeHtmlContent(decodeBase64(htmlPart.body.data));
    }
    // If no HTML, try to find plain text part
    const textPart = payload.parts.find((part: gmail_v1.Schema$MessagePart) => part.mimeType === 'text/plain' && part.body && part.body.data);
    if (textPart && textPart.body && textPart.body.data) {
      const plainText = decodeBase64(textPart.body.data);
      // Convert plain text to HTML with line breaks
      return plainText.replace(/\n/g, '<br/>');
    }
    // Check for nested multipart content
    for (const part of payload.parts) {
      if (part.parts) {
        const nestedContent = extractHtmlContent(part);
        if (nestedContent) return nestedContent;
      }
    }
  }
  return '';
}

// Find and extract inline attachments (images) from email parts
export interface InlineAttachment {
  contentId: string;
  data?: string;  // Base64 data if available
  attachmentId?: string;  // ID to fetch data if not immediately available
  messageId?: string;  // Message ID needed to fetch the attachment
  mimeType: string;
}

export const extractInlineAttachments = (emailId: string, email: gmail_v1.Schema$MessagePart): Record<string, InlineAttachment> => {
  const attachments: Record<string, InlineAttachment> = {};
  const processEmailPart = (part: gmail_v1.Schema$MessagePart) => {
    // Look for parts with content IDs (typically inline images)
    const contentIdHeader = (part.headers || []).find((h: gmail_v1.Schema$MessagePartHeader) =>
      h.name && (h.name.toLowerCase() === 'content-id' || h.name.toLowerCase() === 'x-attachment-id')
    );
    const contentDisposition = (part.headers || []).find((h: gmail_v1.Schema$MessagePartHeader) =>
      h.name && h.name.toLowerCase() === 'content-disposition'
    );
    const isInline = contentDisposition && typeof contentDisposition.value === 'string' &&
      contentDisposition.value.toLowerCase().includes('inline');
    // If we have a content ID, this might be an inline attachment
    if (contentIdHeader && (isInline || (typeof part.mimeType === 'string' && part.mimeType.startsWith('image/')))) {
      const contentId = (contentIdHeader.value || '').replace(/[<>]/g, '');
      const attachment: InlineAttachment = {
        contentId: contentId,
        mimeType: part.mimeType || 'application/octet-stream'
      };
      // If data is available immediately, use it
      if (part.body?.data) {
        attachment.data = part.body.data;
      } else if (part.body?.attachmentId) {
        attachment.attachmentId = part.body.attachmentId;
        attachment.messageId = emailId;
      }
      attachments[contentId] = attachment;
      // For Content-IDs like "image001.jpg@01DB4F99.B8666330", also store with just "image001.jpg"
      const filenamePart = contentId.split('@')[0];
      if (filenamePart && filenamePart !== contentId) {
        attachments[filenamePart] = attachment;
      }
    }
    // Recursively check nested parts
    if (part.parts) {
      part.parts.forEach(processEmailPart);
    }
  };
  processEmailPart(email);
  return attachments;
};

// Replace CID references in HTML with actual base64 data
export const replaceInlineAttachments = async (
  html: string, 
  attachments: Record<string, InlineAttachment>,
  fetchAttachmentData?: (messageId: string, attachmentId: string) => Promise<string | undefined>
): Promise<string> => {
  if (!html || Object.keys(attachments).length === 0) return html;
  
  let result = html;
  
  // Get a list of all CID references in the HTML
  const cidRefs = html.match(/src=["'](?:cid:)?([^"']+)["']/gi) || [];
  const cidKeys = cidRefs.map(ref => {
    // Extract the CID from the src attribute
    const match = ref.match(/src=["'](?:cid:)?([^"']+)["']/i);
    return match ? match[1] : null;
  }).filter(Boolean) as string[];
  
  // Process each inline attachment
  for (const [contentId, attachment] of Object.entries(attachments)) {
    // Skip if this contentId is not referenced in the HTML
    const isReferenced = cidKeys.some(key => 
      key === contentId || 
      key === `cid:${contentId}` || 
      (contentId.includes('@') && key === contentId.split('@')[0]) ||
      key === contentId.split('.')[0]  // Without extension
    );
    
    if (!isReferenced) continue;
    
    let base64Data = attachment.data;
    
    // If data is not available and we need to fetch it
    if (!base64Data && attachment.attachmentId && attachment.messageId && fetchAttachmentData) {
      try {
        base64Data = await fetchAttachmentData(attachment.messageId, attachment.attachmentId);
        // Update the attachment with the fetched data
        attachment.data = base64Data;
      } catch (error) {
        console.error(`Failed to fetch attachment data for ${contentId}:`, error);
        continue;
      }
    }
    
    // If we still don't have data, skip this attachment
    if (!base64Data) continue;
    
    // Match different possible CID reference formats
    const patterns = [
      // Standard cid: format
      new RegExp(`src=["']cid:${contentId}["']`, 'gi'),
      // Without cid: prefix
      new RegExp(`src=["']${contentId}["']`, 'gi'),
    ];
    
    // For image001.jpg@domain format, also try to match just the image001.jpg part
    if (contentId.includes('@')) {
      const filenamePart = contentId.split('@')[0];
      patterns.push(
        new RegExp(`src=["']cid:${filenamePart}["']`, 'gi'),
        new RegExp(`src=["']${filenamePart}["']`, 'gi')
      );
    }
    
    const mimeType = attachment.mimeType || guessMimeType(base64Data);
    const dataUrl = `src="data:${mimeType};base64,${base64Data}"`;
    
    // Apply all patterns
    patterns.forEach(regex => {
      result = result.replace(regex, dataUrl);
    });
    
    // Also check for filename without extension (e.g., "image001" instead of "image001.jpg")
    const filenameWithoutExt = contentId.split('.')[0];
    if (filenameWithoutExt && filenameWithoutExt !== contentId) {
      const filenameRegex = new RegExp(`src=["']cid:${filenameWithoutExt}["']`, 'gi');
      result = result.replace(filenameRegex, dataUrl);
    }
  }
  
  // Debug console log to show if there are any remaining cid: references
  const remainingCids = result.match(/src=["']cid:[^"']+["']/gi);
  if (remainingCids && remainingCids.length > 0) {
    // console.log('Remaining unresolved CID references:', remainingCids);
    // console.log('Available content IDs:', Object.keys(attachments));
  }
  
  return result;
};

// Helper to guess MIME type from base64 data
const guessMimeType = (base64Data: string): string => {
  // Look at the first few characters to determine file type
  const firstChars = atob(base64Data.substring(0, 8));
  
  // Check for common image file signatures
  if (firstChars.startsWith('\xFF\xD8')) return 'image/jpeg';
  if (firstChars.startsWith('\x89PNG\r\n\x1A\n')) return 'image/png'; 
  if (firstChars.startsWith('GIF87a') || firstChars.startsWith('GIF89a')) return 'image/gif';
  if (firstChars.startsWith('RIFF') && firstChars.substring(8, 12) === 'WEBP') return 'image/webp';
  
  // Default to generic binary data
  return 'application/octet-stream';
};

// (getHeader removed: unused)

// Helper to check if an email has attachments
export const hasAttachments = (message: GMessage): boolean => {
  // Check if there's a label that indicates attachments
  if ((message.labelIds || []).includes('HAS_ATTACHMENT')) {
    return true;
  }
  // If no label, check the payload structure
  const payload = message.payload;
  // Function to recursively check parts for attachments
  const checkPartsForAttachments = (parts?: gmail_v1.Schema$MessagePart[]): boolean => {
    if (!parts || !Array.isArray(parts)) return false;
    for (const part of parts) {
      // Check if this part is an attachment (has filename and not inline)
      if (part.filename && part.filename.length > 0) {
        // Exclude inline images which are often not considered "attachments" by users
        const contentDispositionHeader = (part.headers || []).find((h: gmail_v1.Schema$MessagePartHeader) =>
          h.name && h.name.toLowerCase() === 'content-disposition'
        );
        const isInline = contentDispositionHeader && typeof contentDispositionHeader.value === 'string' &&
          contentDispositionHeader.value.toLowerCase().includes('inline');
        // If it's not an inline image or if the filename looks like an attachment
        if (!isInline || !(typeof part.mimeType === 'string' && part.mimeType.startsWith('image/'))) {
          return true;
        }
      }
      // Recursively check nested parts
      if (part.parts && checkPartsForAttachments(part.parts)) {
        return true;
      }
    }
    return false;
  };
  if (payload && payload.parts) {
    return checkPartsForAttachments(payload.parts);
  }
  // No parts to check
  return false;
};

// Extract attachment information from email payload
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  attachmentId?: string;
  data?: string; // Base64 encoded data
}

export const extractAttachments = (emailPayload: gmail_v1.Schema$MessagePart): Attachment[] => {
  const attachments: Attachment[] = [];
  
  const processEmailPart = (part: gmail_v1.Schema$MessagePart, partId: string = '') => {
    // Skip parts with no bodies
    if (!part) return;
    
    // Check if this part has a filename (typical for attachments)
    if (part.filename && part.filename.length > 0) {
      // Get the content disposition to check if it's an attachment vs inline image
      const contentDisposition = (part.headers || []).find((h: gmail_v1.Schema$MessagePartHeader) => 
        h.name && h.name.toLowerCase() === 'content-disposition'
      );

      const isInline = contentDisposition && typeof contentDisposition.value === 'string' &&
        contentDisposition.value.toLowerCase().includes('inline') &&
        typeof part.mimeType === 'string' && part.mimeType.startsWith('image/');
      // If it's not inline or it has a distinct filename, consider it an attachment
      if (!isInline || part.filename.length > 3) {
        const attachment: Attachment = {
          id: partId || part.partId || `attachment-${attachments.length + 1}`,
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body?.size || 0,
          attachmentId: part.body?.attachmentId ?? undefined
        };
        // If small attachment data is already in the response, include it
        if (part.body?.data) {
          attachment.data = part.body.data;
        }
        attachments.push(attachment);
      }
    }
    
    // Recursively process nested parts
    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach((nestedPart: gmail_v1.Schema$MessagePart, index: number) => {
        const nestedPartId = partId ? `${partId}.${index + 1}` : `${index + 1}`;
        processEmailPart(nestedPart, nestedPartId);
      });
    }
  };
  
  // Start processing from the top level
  processEmailPart(emailPayload);
  
  return attachments;
};

// Convert attachment size to human-readable format
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// No longer needed: parseEmailData. Use gmail_Message directly throughout the app.