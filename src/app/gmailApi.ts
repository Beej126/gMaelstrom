import { refreshGmailAccessToken } from './GAuthApi';
import { getGmailAccessToken } from './GToken';
import { gmailApiBatchFetch } from './gmailApiBatchFetch';


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
  labelId?: string,
  options?: { maxResults?: number }
): Promise<{ emails: Array<{ id: string; threadId: string; snippet: string; labelIds: string[] }>; nextPageToken: string | null; total: number }> => {
  try {
    if (!getGmailAccessToken()) {
      throw new Error('No access token available. Please sign in.');
    }
    // Use labelIds for folder filtering (Inbox, Sent, Spam, Trash, etc.)
    const maxResults = options?.maxResults ?? 50;
    const params = new URLSearchParams({
      maxResults: String(maxResults),
      ...(pageToken ? { pageToken } : {}),
      ...(labelId ? { labelIds: labelId } : {}),
    });
    const data = await gmailApiFetch(`messages?${params.toString()}`);
    const messages = data.messages || [];
    const nextPageToken = data.nextPageToken || null;
    const total = typeof data.resultSizeEstimate === 'number' ? data.resultSizeEstimate : 0;
    if (!messages.length) return { emails: [], nextPageToken, total };

    // Batch fetch message metadata for all messages in this page
    const messageIds = messages.map((m: { id: string }) => m.id);
    const batchResults = await gmailApiBatchFetch(messageIds);
    // Only include valid message objects (must have id)
    const emails = batchResults
      .filter(
        (meta): meta is {
          id: string;
          threadId: string;
          snippet: string;
          labelIds: string[];
          payload?: gapi.client.gmail.MessagePart;
        } =>
          !!meta &&
          typeof meta.id === 'string' &&
          typeof meta.threadId === 'string' &&
          typeof meta.snippet === 'string' &&
          Array.isArray(meta.labelIds)
      )
      .map(meta => ({
        id: meta.id,
        threadId: meta.threadId,
        snippet: meta.snippet,
        labelIds: meta.labelIds,
        payload: meta.payload,
      }));
    return { emails, nextPageToken, total };
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