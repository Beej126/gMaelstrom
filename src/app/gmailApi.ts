import { refreshGmailAccessToken } from './GAuthApi';
import { getGmailAccessToken } from './GToken';


// Helper for Gmail API requests
const gmailApiFetch = async (endpoint: string, options: RequestInit = {}, retry = true) => {
  if (!getGmailAccessToken()) throw new Error('No access token available. Please sign in.');
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`;
  const headers = {
    Authorization: `Bearer ${getGmailAccessToken()}`,
    'Accept': 'application/json',
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && retry) {
    // Try to refresh token and retry once
    try {
      await refreshGmailAccessToken();
      // Use the new token
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${getGmailAccessToken()}`,
      };
      const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
      if (!retryResponse.ok) throw new Error(`Gmail API error: ${retryResponse.statusText}`);
      return retryResponse.json();
    } catch {
      throw new Error('Token refresh failed. Please sign in again.');
    }
  }
  if (!response.ok) throw new Error(`Gmail API error: ${response.statusText}`);
  // Gmail batchModify and some endpoints return 204 No Content or empty body
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};


// Fetch emails with optional pagination and label filtering
export const getEmails = async (
  pageToken?: string,
  labelId?: string
): Promise<{ emails: Array<{ id: string; threadId: string; snippet: string; labelIds: string[] }>; nextPageToken: string | null }> => {
  try {
    if (!getGmailAccessToken()) {
      throw new Error('No access token available. Please sign in.');
    }
    // Use labelIds for folder filtering (Inbox, Sent, Spam, Trash, etc.)
    const params = new URLSearchParams({
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
      ...(labelId ? { labelIds: labelId } : {}),
    });
    const data = await gmailApiFetch(`messages?${params.toString()}`);
    const messages = data.messages || [];
    const nextPageToken = data.nextPageToken || null;

    if (!messages.length) return { emails: [], nextPageToken };

    // Fetch message metadata in batch (using format=minimal for efficiency)
    const emailPromises = messages.map(async (message: { id: string; threadId: string }) => {
      // Only fetch minimal fields for list view
      const meta = await gmailApiFetch(`messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
      return {
        id: meta.id,
        threadId: meta.threadId,
        snippet: meta.snippet,
        labelIds: meta.labelIds || [],
        payload: meta.payload, // contains headers for From, Subject, Date
      };
    });
    const emails = await Promise.all(emailPromises);
    return { emails, nextPageToken };
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
};

// Fetch full message details only when needed (e.g., when user opens an email)
export const getEmailById = async (id: string): Promise<gapi.client.gmail.Message> => {
  return gmailApiFetch(`messages/${id}?format=full`);
};
export const getEmailThread = async (threadId: string): Promise<gapi.client.gmail.Message[]> => {
  try {
    const thread = await gmailApiFetch(`threads/${threadId}`);
    const emails: gapi.client.gmail.Message[] = thread.messages || [];
    return emails;
  } catch (error) {
    console.error('Error fetching email thread:', error);
    throw error;
  }
};

export const getAttachmentData = async (messageId: string, attachmentId: string): Promise<string> => {
  try {
    const response = await gmailApiFetch(`messages/${messageId}/attachments/${attachmentId}`);
    const urlSafeBase64 = response.data || '';
    const standardBase64 = urlSafeBase64.replace(/-/g, '+').replace(/_/g, '/');
    return standardBase64;
  } catch (error) {
    console.error('Error fetching attachment data:', error);
    throw error;
  }
};

export const getGmailLabels = async (): Promise<Array<{ id: string; name: string }>> => {
  try {
    const response = await gmailApiFetch('labels');
    return (response.labels || []).map((label: gapi.client.gmail.Label) => ({ id: label.id, name: label.name }));
  } catch (error) {
    console.error('Error fetching labels:', error);
    throw error;
  }
};

export const markEmailsAsUnread = async (emailIds: string[]): Promise<void> => {
  if (!emailIds.length) return;
  try {
    await gmailApiFetch('messages/batchModify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: emailIds,
        addLabelIds: ['UNREAD'],
        removeLabelIds: [],
      }),
    });
  } catch (error) {
    console.error('Error marking emails as unread:', error);
    throw error;
  }
};

export const markEmailsAsRead = async (emailIds: string[]): Promise<void> => {
  if (!emailIds.length) return;
  try {
    await gmailApiFetch('messages/batchModify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: emailIds,
        addLabelIds: [],
        removeLabelIds: ['UNREAD'],
      }),
    });
  } catch (error) {
    console.error('Error marking emails as read:', error);
    throw error;
  }
};