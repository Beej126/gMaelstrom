import { Email } from '../types/email';
import { parseEmailData } from '../utils/emailParser';

let accessToken: string | null = null;

export const setGmailAccessToken = (token: string) => {
  accessToken = token;
  localStorage.setItem('gMaelstrom_accessToken', token);
};

// Helper to always get the latest token from localStorage if needed
const getAccessToken = (): string | null => {
  if (accessToken) return accessToken;
  return localStorage.getItem('gMaelstrom_accessToken');
};

interface EmailsResponse {
  emails: Email[];
  nextPageToken: string | null;
}

// Helper for Gmail API requests
const gmailApiFetch = async (endpoint: string, options: RequestInit = {}) => {
  if (!getAccessToken()) throw new Error('No access token available. Please sign in.');
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`;
  const headers = {
    Authorization: `Bearer ${getAccessToken()}`,
    'Accept': 'application/json',
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) throw new Error(`Gmail API error: ${response.statusText}`);
  return response.json();
};

// eslint-disable-next-line 
export const getEmails = async (pageToken: string | null = null, labelId: string = 'INBOX'): Promise<EmailsResponse> => {
  try {
    if (!getAccessToken()) {
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

    // Fetch full email details for each message
    const emailPromises = messages.map(async (message: any) => {
      const emailData = await gmailApiFetch(`messages/${message.id}?format=full`);
      return parseEmailData(emailData);
    });
    const emails = await Promise.all(emailPromises);

    return { emails, nextPageToken };
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
};

export const getEmailThread = async (threadId: string): Promise<Email[]> => {
  try {
    const thread = await gmailApiFetch(`threads/${threadId}`);
    const emails = thread.messages?.map((message: any) => parseEmailData(message)) || [];
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
    return (response.labels || []).map((label: any) => ({ id: label.id, name: label.name }));
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