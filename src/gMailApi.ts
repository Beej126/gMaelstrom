// @internal - Only import via ctxApiDataCache.tsx

import { getAuthedUser } from './gAuthApi';
import { gmailApiBatchFetch } from './gMailApiBatchFetch';
import { toast } from 'react-toastify';


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// general error handling convention for all API calls:
//   - don't catch any errors - caller code should just assume success and upon failure exceptions will cleanly abort the call stack
//   - create and throw exceptions for known HTTP errors that aren't already exceptions
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


export const getEmails = async (
  pageToken?: string,
  labelId?: string,
  options?: { maxResults?: number }
): Promise<{ emails: Array<{ id: string; threadId: string; snippet: string; labelIds: string[] }>; nextPageToken: string | null; total: number }> => {

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
};

// Fetch full message details only when needed (e.g., when user opens an email)
export const getEmailDetailsById = async (id: string): Promise<gapi.client.gmail.Message> => {
  return gmailApiFetch(`messages/${id}?format=full`);
};

export const getEmailThread = async (threadId: string): Promise<gapi.client.gmail.Message[]> =>
  (await gmailApiFetch(`threads/${threadId}`)).messages ?? [];


export const getAttachmentData = async (messageId: string, attachmentId: string): Promise<string> => {
  const response = await gmailApiFetch(`messages/${messageId}/attachments/${attachmentId}`);
  const urlSafeBase64 = response.data ?? '';
  const standardBase64 = urlSafeBase64.replace(/-/g, '+').replace(/_/g, '/');
  return standardBase64;
};


export type gmail_Label = Required<Pick<gapi.client.gmail.Label, 'id' | 'name' | 'type'>> & gapi.client.gmail.Label;

const getLabels = async (): Promise<gmail_Label[]> =>
  (await gmailApiFetch('labels')).labels ?? [];


export const markEmailIdsAsRead = async (emailIds: string[], asRead: boolean): Promise<void> => {
  if (!emailIds.length) return;

  return gmailApiFetch('messages/batchModify', "POST", {
    ids: emailIds,
    ...(asRead ? { removeLabelIds: ['UNREAD'] } : { addLabelIds: ['UNREAD'] })
  });
};


const toastAndThrow = (error: unknown, endpoint: string, extra?: string) => {
  toast.error(`Error fetching GMail API '${endpoint}'${extra ? extra + '\n' : ''}${error instanceof Error ? "\n" + error.message : ""}`);
  throw error;
}

const gmailApiFetch = async (endpoint: string, method: "GET" | "POST" = "GET", body?: object) => {

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`;
  const headers = {
    Authorization: `Bearer ${(await getAuthedUser())?.accessToken}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  try {
    let response = await fetch(url, { headers, method, body: body ? JSON.stringify(body) : undefined });

    // if unauthorized, attempt *once* to get a fresh token and retry
    if (response.status === 401) {
      headers.Authorization = `Bearer ${(await getAuthedUser(true))?.accessToken}`;
      response = await fetch(url, { headers, method, body: body ? JSON.stringify(body) : undefined });
    }

    if (!response.ok) {
      toastAndThrow(undefined, endpoint, response.statusText);
    }

    // Gmail batchModify and some endpoints return 204 No Content or empty body
    if (response.status === 204) return null;

    return response.json();

  } catch (ex) {
    toastAndThrow(ex, endpoint);
  }

};

export default {
  getEmails,
  getEmailDetailsById,
  getEmailThread,
  getAttachmentData,
  getLabels,
  markEmailIdsAsRead,
};