import { Email } from '../types/email';

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
  } catch (e) {
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
  
  // Start processing from the root elements
  Array.from(tempDiv.children).forEach(processNode as any);
  
  // Remove any <style> tags that might contain color definitions
  const styleTags = tempDiv.querySelectorAll('style');
  styleTags.forEach(styleTag => {
    styleTag.textContent = styleTag.textContent?.replace(/color:.*?;/gi, '')
      .replace(/background(-color)?:.*?;/gi, '') ?? null;
  });
  
  return tempDiv.innerHTML;
}

// Helper function to extract HTML content from a multipart email
export const extractHtmlContent = (email: any): string => {
  // Check if the email has a simple body
  if (email.body?.data) {
    return sanitizeHtmlContent(decodeBase64(email.body.data));
  }
  
  // Check for multipart content
  if (email.parts) {
    // First try to find HTML part
    const htmlPart = email.parts.find((part: any) => 
      part.mimeType === 'text/html' && part.body?.data
    );
    
    if (htmlPart && htmlPart.body?.data) {
      return sanitizeHtmlContent(decodeBase64(htmlPart.body.data));
    }
    
    // If no HTML, try to find plain text part
    const textPart = email.parts.find((part: any) => 
      part.mimeType === 'text/plain' && part.body?.data
    );
    
    if (textPart && textPart.body?.data) {
      const plainText = decodeBase64(textPart.body.data);
      // Convert plain text to HTML with line breaks
      return plainText.replace(/\n/g, '<br/>');
    }
    
    // Check for nested multipart content
    for (const part of email.parts) {
      if (part.parts) {
        const nestedContent = extractHtmlContent(part);
        if (nestedContent) return nestedContent;
      }
    }
  }
  
  return '';
};

// Find and extract inline attachments (images) from email parts
export interface InlineAttachment {
  contentId: string;
  data?: string;  // Base64 data if available
  attachmentId?: string;  // ID to fetch data if not immediately available
  messageId?: string;  // Message ID needed to fetch the attachment
  mimeType: string;
}

export const extractInlineAttachments = (emailId: string, email: gapi.client.gmail.MessagePart): Record<string, InlineAttachment> => {
  const attachments: Record<string, InlineAttachment> = {};
  
  const processEmailPart = (part: any) => {
    // Look for parts with content IDs (typically inline images)
    const contentIdHeader = (part.headers || []).find((h: any) => 
      h.name.toLowerCase() === 'content-id' || h.name.toLowerCase() === 'x-attachment-id'
    );
    
    const contentDisposition = (part.headers || []).find((h: any) => 
      h.name.toLowerCase() === 'content-disposition'
    );
    
    const isInline = contentDisposition && 
      contentDisposition.value.toLowerCase().includes('inline');
    
    // If we have a content ID, this might be an inline attachment
    if (contentIdHeader && (isInline || part.mimeType.startsWith('image/'))) {
      // Extract the content ID, removing angle brackets if present
      let contentId = contentIdHeader.value.replace(/[<>]/g, '');
      
      const attachment: InlineAttachment = {
        contentId: contentId,
        mimeType: part.mimeType || 'application/octet-stream'
      };
      
      // If data is available immediately, use it
      if (part.body?.data) {
        attachment.data = part.body.data;
      } 
      // Otherwise store the attachmentId for later fetching
      else if (part.body?.attachmentId) {
        attachment.attachmentId = part.body.attachmentId;
        attachment.messageId = emailId;
      }
      
      // Store both the full Content-ID and just the filename part for more robust matching
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
  
  // Start processing from the email payload
  processEmailPart(email);
  
  return attachments;
};

// Replace CID references in HTML with actual base64 data
export const replaceInlineAttachments = async (
  html: string, 
  attachments: Record<string, InlineAttachment>,
  fetchAttachmentData?: (messageId: string, attachmentId: string) => Promise<string>
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
    console.log('Remaining unresolved CID references:', remainingCids);
    console.log('Available content IDs:', Object.keys(attachments));
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

// Extract a specific header value from headers array
const getHeader = (headers: any[], name: string): string => {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
};

// Helper to check if an email has attachments
const hasAttachments = (message: any): boolean => {
  // Check if there's a label that indicates attachments
  if ((message.labelIds || []).includes('HAS_ATTACHMENT')) {
    return true;
  }
  
  // If no label, check the payload structure
  const payload = message.payload;
  
  // Function to recursively check parts for attachments
  const checkPartsForAttachments = (parts: any[]): boolean => {
    if (!parts || !Array.isArray(parts)) return false;
    
    for (const part of parts) {
      // Check if this part is an attachment (has filename and not inline)
      if (part.filename && part.filename.length > 0) {
        // Exclude inline images which are often not considered "attachments" by users
        const contentDispositionHeader = (part.headers || []).find((h: any) => 
          h.name.toLowerCase() === 'content-disposition'
        );
        const isInline = contentDispositionHeader && 
          contentDispositionHeader.value.toLowerCase().includes('inline');
        
        // If it's not an inline image or if the filename looks like an attachment
        if (!isInline || !part.mimeType.startsWith('image/')) {
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
  
  // Check parts for attachments
  if (payload.parts) {
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

export const extractAttachments = (emailPayload: any): Attachment[] => {
  const attachments: Attachment[] = [];
  
  const processEmailPart = (part: any, partId: string = '') => {
    // Skip parts with no bodies
    if (!part) return;
    
    // Check if this part has a filename (typical for attachments)
    if (part.filename && part.filename.length > 0) {
      // Get the content disposition to check if it's an attachment vs inline image
      const contentDisposition = (part.headers || []).find((h: any) => 
        h.name.toLowerCase() === 'content-disposition'
      );

      const isInline = contentDisposition && 
        contentDisposition.value.toLowerCase().includes('inline') && 
        part.mimeType.startsWith('image/');
      
      // If it's not inline or it has a distinct filename, consider it an attachment
      if (!isInline || part.filename.length > 3) {
        const attachment: Attachment = {
          id: partId || part.partId || `attachment-${attachments.length + 1}`,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body?.size || 0,
          attachmentId: part.body?.attachmentId
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
      part.parts.forEach((nestedPart: any, index: number) => {
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

// Convert Gmail API message to our Email interface
export const parseEmailData = (message: gapi.client.gmail.Message): Email => {
  const headers = message.payload?.headers ?? [];
  
  const from = getHeader(headers, 'From');
  const to = getHeader(headers, 'To').split(',').map((email: string) => email.trim());
  const subject = getHeader(headers, 'Subject');
  const dateStr = getHeader(headers, 'Date');
  
  // Parse email body
  // let body = '';
  // const mimeType = message.payload?.mimeType;
  
  // if (mimeType === 'text/plain' || mimeType === 'text/html') {
  //   body = !!message.payload?.body?.data 
  //     ? decodeBase64(message.payload.body.data)
  //     : '';
  // } else if (message.payload?.parts) {
  //   // Multipart email, try to find text parts
  //   const textPart = message.payload.parts.find((part: any) => 
  //     part.mimeType === 'text/plain' || part.mimeType === 'text/html'
  //   );
    
  //   if (textPart && textPart.body && textPart.body.data) {
  //     body = decodeBase64(textPart.body.data);
  //   }
  // }
  
  // Check if any label indicates the email is read
  const isRead = !(message.labelIds || []).includes('UNREAD');
  
  // Check if any label indicates the email is starred
  const isStarred = (message.labelIds || []).includes('STARRED');
  
  // Check if any label indicates the email is important
  const isImportant = (message.labelIds || []).includes('IMPORTANT');
  
  // Determine category based on labels
  let category = 'Inbox';
  if ((message.labelIds || []).includes('SENT')) {
    category = 'Sent';
  } else if ((message.labelIds || []).includes('DRAFT')) {
    category = 'Drafts';
  } else if ((message.labelIds || []).includes('SPAM')) {
    category = 'Spam';
  } else if ((message.labelIds || []).includes('TRASH')) {
    category = 'Trash';
  }

  // Check for attachments
  const hasEmailAttachments = hasAttachments(message);

  if (!message.id) throw new Error('gMail Message ID came back undefined. Lots of logic depends on this being populated.');

  return {
    id: message.id!,
    labelIds: message.labelIds || [],
    gapiMessage: message,
    from,
    to,
    subject,
    date: new Date(dateStr),
    isRead,
    isStarred,
    isImportant,
    category,
    hasAttachments: hasEmailAttachments
  };
};