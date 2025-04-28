import { Email } from '../types/email';
import { gapi } from 'gapi-script';
import { parseEmailData } from '../utils/emailParser';

// Configuration for Gmail API
// const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

let accessToken: string | null = null;

export const setGmailAccessToken = (token: string) => {
  accessToken = token;
};

interface EmailsResponse {
  emails: Email[];
  nextPageToken: string | null;
}

// eslint-disable-next-line 
export const getEmails = async (pageToken: string | null = null, _category = 'INBOX'): Promise<EmailsResponse> => {
  try {
    if (!accessToken) {
      throw new Error('No access token available. Please sign in.');
    }

    // Build the query based on category
    // let query = `in:${category}`;

    // Get list of messages with pagination support
    const response = await gapi.client.gmail.users.messages.list({
      //https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list
      userId: 'me',
      maxResults: 50,
      pageToken: pageToken || undefined,
      // labelIds: ["INBOX"]//[category], //using labelIds vs query since query wasn't including emails sent from myself in inbox since they are also in sent
      q: "label:inbox OR label:pending"
    });

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