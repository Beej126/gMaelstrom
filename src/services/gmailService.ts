import { Email } from '../types/email';
import { gapi } from 'gapi-script';
import { parseEmailData } from '../utils/emailParser';

let accessToken: string | null = null;

export const setGmailAccessToken = (token: string) => {
  accessToken = token;
};

interface EmailsResponse {
  emails: Email[];
  nextPageToken: string | null;
}

// eslint-disable-next-line 
export const getEmails = async (pageToken: string | null = null, labelId: string = 'INBOX'): Promise<EmailsResponse> => {
  try {
    if (!accessToken) {
      throw new Error('No access token available. Please sign in.');
    }

    // Use labelIds for folder filtering (Inbox, Sent, Spam, Trash, etc.)
    const params: any = {
      userId: 'me',
      maxResults: 50,
      pageToken: pageToken || undefined,
    };
    if (labelId) {
      params.labelIds = [labelId];
    }
    // Do not use 'q' for folder filtering; only use for custom search

    const response = await gapi.client.gmail.users.messages.list(params);

    const messages = response.result.messages || [];
    const nextPageToken = response.result.nextPageToken || null;

    // Fetch full email details for each message
    const emailPromises = messages.map(async message => {
      const emailData = await gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'full'
      });

      return parseEmailData(emailData.result);
    });

    const emails = await Promise.all(emailPromises);

    return {
      emails,
      nextPageToken
    };
  } catch (error) {
    console.error('Error fetching emails:', error);
    throw error;
  }
};

export const getEmailThread = async (threadId: string): Promise<Email[]> => {
  try {
    if (!accessToken) {
      throw new Error('No access token available. Please sign in.');
    }

    const thread = await gapi.client.gmail.users.threads.get({
      userId: 'me',
      id: threadId
    });

    const emails = thread.result.messages?.map(message => parseEmailData(message)) || [];
    return emails;
  } catch (error) {
    console.error('Error fetching email thread:', error);
    throw error;
  }
};

// Fetch attachment data using the message ID and attachment ID
export const getAttachmentData = async (messageId: string, attachmentId: string): Promise<string> => {
  try {
    if (!accessToken) {
      throw new Error('No access token available. Please sign in.');
    }

    const response = await gapi.client.gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId
    });

    // nugget: Convert URL-safe base64 format to standard base64 format
    // wow, this really should be called out a lot more promently in the documentation
    // The Gmail API returns base64url format (URL-safe) which needs to be converted for use in data URIs
    const urlSafeBase64 = response.result.data || '';
    const standardBase64 = urlSafeBase64.replace(/-/g, '+').replace(/_/g, '/');

    return standardBase64;
  } catch (error) {
    console.error('Error fetching attachment data:', error);
    throw error;
  }
};

// Add to gmailService.ts
export const getGmailLabels = async (): Promise<Array<{ id: string; name: string }>> => {
  if (!accessToken) {
    throw new Error('No access token available. Please sign in.');
  }
  const response = await gapi.client.gmail.users.labels.list({ userId: 'me' });
  return (response.result.labels || []).map((label: any) => ({ id: label.id, name: label.name }));
};

// Mark one or more emails as unread
export const markEmailsAsUnread = async (emailIds: string[]): Promise<void> => {
  if (!accessToken) {
    throw new Error('No access token available. Please sign in.');
  }
  if (!emailIds.length) return;
  try {
    await gapi.client.gmail.users.messages.batchModify({
      userId: 'me',
      resource: {
        ids: emailIds,
        addLabelIds: ['UNREAD'],
        removeLabelIds: [], // 'READ' is not a valid label
      },
    });
  } catch (error) {
    console.error('Error marking emails as unread:', error);
    throw error;
  }
};

// Mark one or more emails as read
export const markEmailsAsRead = async (emailIds: string[]): Promise<void> => {
  if (!accessToken) {
    throw new Error('No access token available. Please sign in.');
  }
  if (!emailIds.length) return;
  try {
    await gapi.client.gmail.users.messages.batchModify({
      userId: 'me',
      resource: {
        ids: emailIds,
        addLabelIds: [],
        removeLabelIds: ['UNREAD'],
      },
    });
  } catch (error) {
    console.error('Error marking emails as read:', error);
    throw error;
  }
};