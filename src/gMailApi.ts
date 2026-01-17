// @internal - Only import this module into ctxApiDataCache.tsx, don't use it anywhere else in the app

import { getAuthedUser } from './gAuthApi';
import { gmailApiBatchFetch } from './gMailApiBatchFetch';
import { toast } from 'react-toastify';


// extend some base gmail API types to make some fields required that we always expect to be present so callers don't need to be littered with unecessary undefined checks to avoid lint errors
export type GLabel = Required<Pick<gapi.client.gmail.Label, 'id' | 'name' | 'type'>> & gapi.client.gmail.Label;
export type GMessage = Required<Pick<gapi.client.gmail.Message, 'id' | 'threadId' | 'snippet' | 'labelIds'>> & gapi.client.gmail.Message;
export type GThread = Required<Pick<gapi.client.gmail.Thread, 'id' | 'snippet'>>;
export type GListThreadsResponse = Required<Pick<gapi.client.gmail.ListThreadsResponse, 'nextPageToken' | 'resultSizeEstimate'>> & { threads: GThread[] };


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// general error handling convention for all google API calls:
//   - don't catch any errors - caller code should assume success and upon failure, exceptions will cleanly abort the call stack
//   - create and throw exceptions for known HTTP errors that aren't already exceptions
//   - exceptions will be toasted back to the user in addition to re-throwing up the stack... 
//     this is a debatble UI in API code smell but i've always liked this approach 
//     vs littering exception handling upstream just for this one reason common to all calls
//
// keep the leanest raw gmail API call logic here so we can tell the difference... 
//   just the REST call and response, no bundling or further processing... 
//   put all further bundling logic in the data cache layer APIs
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export const getApiThreadsByLabelId = (
  labelId: string,
  pageSize: number,
  pageToken: string | null
): Promise<GListThreadsResponse> => gApiFetchJson("threads", "GET", {
  maxResults: pageSize.toString(),
  labelIds: labelId, // Note: The API allows multiple labels via CSV if that's ever handy
  pageToken: pageToken,
});


export const getApiMessages = async (
  labelId: string,
  pageSize: number,
  pageToken: string | null
): Promise<{ emails: Array<{ id: string; threadId: string; snippet: string; labelIds: string[] }>; nextPageToken: string | null; total: number }> => {

  const params = new URLSearchParams({
    maxResults: String(pageSize),
    ...(pageToken ? { pageToken } : {}),
    ...(labelId ? { labelIds: labelId } : {}),
  });
  const data = await gApiFetchJson(`messages?${params.toString()}`);
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
export const getApiMessageDetailsById = async (id: string): Promise<GMessage> =>
  gApiFetchJson(`messages/${id}?format=full`);

export const getApiThreadMessages = async (threadId: string): Promise<GMessage[]> =>
  (await gApiFetchJson(`threads/${threadId}`)).messages ?? [];


export const getApiAttachmentData = async (messageId: string, attachmentId: string): Promise<string> => {
  const response = await gApiFetchJson(`messages/${messageId}/attachments/${attachmentId}`);
  const urlSafeBase64 = response.data ?? '';
  const standardBase64 = urlSafeBase64.replace(/-/g, '+').replace(/_/g, '/');
  return standardBase64;
};


const getApiLabels = async (): Promise<GLabel[]> => (await gApiFetchJson('labels')).labels ?? [];


export const markApiMessageIdsAsRead = async (emailIds: string[], asRead: boolean): Promise<void> => {
  if (!emailIds.length || !emailIds.filter(Boolean)) return;

  return gApiFetchJson('messages/batchModify', "POST", {
    ids: emailIds,
    ...(asRead ? { removeLabelIds: ['UNREAD'] } : { addLabelIds: ['UNREAD'] })
  });
};

const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/';

export const gApiFetchJson = async (
  endpoint: string, 
  method: "GET" | "POST" = "GET",
  /** converted to URLSearchParams for GET requests */
  parms?: object,
  /** passed in when called from gAuthApi */
  token?: string
) => {

  // allow full url passed from gAuthApi, otherwise assume just a tail end gmail api endpoint passed in needs to be prefixed with the base url (e.g. "messages")
  const url = (endpoint.toLowerCase().startsWith('http') ? '' : GMAIL_API_BASE_URL) + endpoint
    + (parms && method === "GET" ? "?" + new URLSearchParams(parms as Record<string, string>).toString() : "");

  const body = parms && method === "POST" ? JSON.stringify(parms) : undefined;

  let attempt = 0;
  while (++attempt) {

    const headers = {
      // try getting a fresh token on 2nd attempt
      Authorization: `Bearer ${token ?? (await getAuthedUser(attempt === 2))?.accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    try {
      const response = await fetch(url, { headers, method, body });

      // if unauthorized, attempt *once* to get a fresh token and retry
      if (response.status === 401 && !token) { if (attempt === 1) continue; else throw new Error("Auth failed"); }

      if (!response.ok) throw new Error(response.statusText);

      // Gmail batchModify returns 204 No Content which is ok
      if (response.status === 204) return null;

      return response.json();

    } catch (ex) {
      toast.error(`Error fetching GMail API '${endpoint}'${ex instanceof Error ? "\n" + ex.message : ""}`);
      throw ex;
    }
  };


};

export default {
  getApiMessages,
  getApiMessageDetailsById,
  getApiThreadMessages,
  getApiAttachmentData,
  getApiLabels,
  markMessageIdsAsRead: markApiMessageIdsAsRead,
};