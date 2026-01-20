// @internal - Only import this module into ctxApiDataCache.tsx, don't use it anywhere else in the app

import { getAuthedUser } from './gAuthApi';
import { gmailApiBatchFetch } from './gMailApiBatchFetch';
import { toast } from 'react-toastify';
import type { gmail_v1 } from "googleapis"; //be SUPER CAREFUL to import only types ... without "type" it could severly expand the runtime bundle size!!
import { StrictRequired } from './helpers/typeHelpers';

// extend some base gmail API types to make some fields required that we always expect to be present so callers don't need to be littered with unecessary undefined checks to avoid lint errors
type GLabelVisibility = 'labelShow' | 'labelShowIfUnread' | 'labelHide';
type GLabelType = "system" | "user";
export type GLabel = StrictRequired<Pick<gmail_v1.Schema$Label, 'id' | 'name'>> & { type: GLabelType; labelListVisibility: GLabelVisibility };// & gapi.client.gmail.Label;

export type GMessage = StrictRequired<Pick<gmail_v1.Schema$Message, 'id' | 'threadId' | 'snippet' | 'labelIds'>> & gmail_v1.Schema$Message;
export type GThread = StrictRequired<Pick<gmail_v1.Schema$Thread, 'id' | 'snippet'>>;
export type GListThreadsResponse = StrictRequired<Pick<gmail_v1.Schema$ListThreadsResponse, 'nextPageToken' | 'resultSizeEstimate'>> & { threads: GThread[] };

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

// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/list
export const getApiThreadsByLabelId = (
  labelId: string,
  pageSize: number,
  pageToken: string | null
) => gApiFetchJson<GListThreadsResponse>("threads", "GET", {
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
  const data = await gApiFetchJson<{ messages?: Array<{ id: string; threadId: string; snippet: string; labelIds: string[] }>; nextPageToken?: string; resultSizeEstimate?: number }>(`messages?${params.toString()}`);
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
        payload?: gmail_v1.Schema$MessagePart;
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

export const getApiThreadMessages = async (threadId: string) =>
  (await gApiFetchJson<{ messages: GMessage[] }>(`threads/${threadId}`)).messages ?? [];


export const getApiAttachmentData = (messageId: string, attachmentId: string) =>
  gApiFetchJson<{ data?: string }>(`messages/${messageId}/attachments/${attachmentId}`).then(resp =>
    resp.data?.replace(/-/g, '+').replace(/_/g, '/'));

const getApiLabels = () => gApiFetchJson<{ labels: GLabel[] }>('labels').then(resp => resp.labels);

// docs: https://developers.google.com/gmail/api/reference/rest/v1/users.labels/patch
export const setApiLabelVisibility = async (labelId: string, visible: boolean) => {
  return gApiFetchJson<void>(`labels/${labelId}`, "PATCH", { labelListVisibility: visible ? 'labelShow' : 'labelHide' } satisfies Partial<GLabel>);
};


export const markApiMessageIdsAsRead = async (emailIds: string[], asRead: boolean) => {
  if (!emailIds.length || !emailIds.filter(Boolean)) return;

  return gApiFetchJson<void>('messages/batchModify', "POST", {
    ids: emailIds,
    ...(asRead ? { removeLabelIds: ['UNREAD'] } : { addLabelIds: ['UNREAD'] })
  });
};

const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/';

// React 18+ "strict mode" causes useEffect to double invoke in dev mode which drives double fetches
//   use a simple fetch promise map based on GET url to dedupe inflight fetches
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inflightFetches = new Map<string, Promise<any>>();


/**
 * Perform an authenticated Gmail API fetch and return parsed JSON.
 * @param endpoint API endpoint tail (e.g. `messages`) or full URL
 * @param method HTTP method, defaults to `GET`
 * @param parms converted to `URLSearchParams` for GET requests or request body for POST
 * @param token optional bearer token to use instead of the default authed user
 */
export const gApiFetchJson = async <T>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  parms?: object,
  token?: string
): Promise<T> => {

  // avoid duplicate fetches (e.g. react fires effects twice in dev builds under strict mode)
  //   assuming we're only avoiding **GETs*** that tend to fire during initial mounts, 
  //   so using endpoint is good enough vs worrying about keying on unique parms
  const existingFetch = inflightFetches.get(endpoint);
  if (existingFetch) return existingFetch;

  // allow full url passed from gAuthApi, otherwise assume just a tail end gmail api endpoint passed in needs to be prefixed with the base url (e.g. "messages")
  const url = (endpoint.toLowerCase().startsWith('http') ? '' : GMAIL_API_BASE_URL) + endpoint
    + (parms && method === "GET" ? "?" + new URLSearchParams(parms as Record<string, string>).toString() : "");

  const body = parms && (["POST", "PATCH"].includes(method)) ? JSON.stringify(parms) : undefined;

  const aborter = new AbortController();
  const fetchPromise = (async () => {
    let attempt = 0;
    while (++attempt) {

      const headers = {
        // try getting a fresh token on 2nd attempt
        Authorization: `Bearer ${token ?? (await getAuthedUser(attempt === 2))?.accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      };

      try {
        const response = await fetch(url, { headers, method, body, signal: aborter.signal });

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
  })();

  inflightFetches.set(endpoint, fetchPromise);
  return fetchPromise;
};

export default {
  getApiMessages,
  getApiMessageDetailsById,

  getApiThreadMessages,

  getApiAttachmentData,

  getApiLabels,
  setApiLabelVisibility,

  markMessageIdsAsRead: markApiMessageIdsAsRead
};