// @internal - Only import this module into ctxApiDataCache.tsx, don't use it anywhere else in the app

import { getAuthedUser } from './gAuthApi';
import { toast } from 'react-toastify';
import type { gmail_v1 } from "googleapis"; //be SUPER CAREFUL to import only types ... without "type" it could severly expand the runtime bundle size!!
import { StrictRequired } from '../helpers/typeHelpers';

// extend some base gmail API types to make some fields required that we always expect to be present so callers don't need to be littered with unecessary undefined checks to avoid lint errors
type GLabelVisibility = 'labelShow' | 'labelShowIfUnread' | 'labelHide' | undefined;
type GLabelType = "system" | "user";
export type GLabel = StrictRequired<Pick<gmail_v1.Schema$Label, 'id' | 'name' | 'threadsUnread'>> & { type: GLabelType; labelListVisibility: GLabelVisibility };

export type GMessage = StrictRequired<Pick<gmail_v1.Schema$Message, 'id' | 'threadId' | 'snippet' | 'labelIds'>> & gmail_v1.Schema$Message;
export type GThread = StrictRequired<Pick<gmail_v1.Schema$Thread, 'id' | 'snippet'>> & gmail_v1.Schema$Thread;

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

export const getApiAttachmentData = (messageId: string, attachmentId: string) =>
  gApiFetchJson<{ data?: string }>(`messages/${messageId}/attachments/${attachmentId}`).then(resp =>
    resp.data?.replace(/-/g, '+').replace(/_/g, '/'));

const getApiLabel = (labelId: string) => gApiFetchJson<GLabel>(`labels/${labelId}`);

const getApiLabels = () => gApiFetchJson<{ labels: GLabel[] }>('labels').then(resp => resp.labels ?? []);

// docs: https://developers.google.com/gmail/api/reference/rest/v1/users.labels/patch
export const setApiLabelVisibility = async (labelId: string, labelListVisibility: GLabelVisibility) => {
  return gApiFetchJson<void>(`labels/${labelId}`, "PATCH", { labelListVisibility } satisfies Partial<GLabel>);
};


export type GThreadWithMessages = StrictRequired<Pick<gmail_v1.Schema$Thread, 'id' | 'snippet' | 'messages'>> & {
  messages: GMessage[];
};
export type GListThreadsResponse = StrictRequired<Pick<gmail_v1.Schema$ListThreadsResponse, 'nextPageToken' | 'resultSizeEstimate'>> & { threads: GThread[] };
export type GThreadHeader = {
  id: string;
  snippet: string;
  latestMessage: GMessage;
  labelIds: string[];
  messageCount: number;
  hasUnread: boolean;
  hasAttachments: boolean;
};

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

export const getApiThreadDetailsById = async (threadId: string, format: 'full' | 'metadata' = 'full'): Promise<GThreadWithMessages> =>
  gApiFetchJson<GThreadWithMessages>(`threads/${threadId}?format=${format}`);

export const getApiThreadMessages = async (threadId: string) =>
  (await getApiThreadDetailsById(threadId, 'full')).messages ?? [];

export const markApiThreadAsRead = async (threadId: string, asRead: boolean) => {
  if (!threadId) return;

  return gApiFetchJson<GThreadWithMessages>(`threads/${threadId}/modify`, 'POST', {
    ...(asRead ? { removeLabelIds: ['UNREAD'] } : { addLabelIds: ['UNREAD'] })
  });
};

export const markApiThreadIdsAsRead = async (threadIds: string[], asRead: boolean) => {
  const validIds = threadIds.filter(Boolean);
  for (let index = 0; index < validIds.length; index++) {
    await markApiThreadAsRead(validIds[index], asRead);
    if (index + 1 < validIds.length) {
      await new Promise(resolve => window.setTimeout(resolve, 75));
    }
  }
};

export const trashApiThread = async (threadId: string) => {
  if (!threadId) return;

  return gApiFetchJson<GThreadWithMessages>(`threads/${threadId}/trash`, 'POST');
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
export const gApiFetchJson = async <T,>(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  parms?: object,
  token?: string
): Promise<T> => {

  const sanitizedParms = parms
    ? Object.fromEntries(
        Object.entries(parms).filter(([_key, value]) => value !== undefined && value !== null)
      )
    : undefined;

  // allow full url passed in from gAuthApi which has different root url
  // otherwise prefix with gmail api base url for majority of calls that just pass in endpoint "tails" 
  const url = (endpoint.toLowerCase().startsWith('http') ? '' : GMAIL_API_BASE_URL) + endpoint
    + (sanitizedParms && method === "GET" ? "?" + new URLSearchParams(sanitizedParms as Record<string, string>).toString() : "");

  // Avoid duplicate GET fetches (e.g. React fires effects twice in dev builds under strict mode).
  // Key by the full resolved URL so different query strings do not collapse into the same inflight request.
  const inflightKey = `${method}:${url}`;
  if (method === 'GET') {
    const existingFetch = inflightFetches.get(inflightKey);
    if (existingFetch) return existingFetch;
  }

  const body = sanitizedParms && (["POST", "PATCH"].includes(method)) ? JSON.stringify(sanitizedParms) : undefined;

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

        if (!response.ok) throw new Error(response.statusText ? response.statusText : (await response.json()).error?.message);

        // Gmail batchModify returns 204 No Content which is ok
        if (response.status === 204) return null;

        return response.json();

      } catch (ex) {
        toast.error(<>GMail API: { endpoint } { ex instanceof Error ? <><br/><br/>{ex.message}</> : "" } </>);
        throw ex;
      } finally {
        if (method === 'GET') inflightFetches.delete(inflightKey);
      }
    };
  })();

  if (method === 'GET') inflightFetches.set(inflightKey, fetchPromise);
  return fetchPromise;
};

export default {
  getApiAttachmentData,

  getApiLabel,
  getApiLabels,
  setApiLabelVisibility,

  getApiThreadsByLabelId,
  getApiThreadDetailsById,
  getApiThreadMessages,
  markThreadAsRead: markApiThreadAsRead,
  markThreadIdsAsRead: markApiThreadIdsAsRead,
  trashThread: trashApiThread,
};