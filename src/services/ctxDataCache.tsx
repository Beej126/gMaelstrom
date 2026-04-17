import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import gMailApi, { GLabel, GMessage, GThread, GThreadHeader } from './gMailApi';
import { SettingName } from './ctxSettings';
import { getFromLocalStorage, saveToLocalStorage } from '../helpers/browserStorage';
import InboxIcon from '@mui/icons-material/Inbox';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import ReportIcon from '@mui/icons-material/Report';
import DescriptionIcon from '@mui/icons-material/Description';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import { SvgIcon } from '@mui/material';
import { GridRowSelectionModel } from '@mui/x-data-grid';
import { Attachment, extractAttachments, extractInlineAttachments, hasAttachments, InlineAttachment } from '../helpers/emailParser';
import { createContextBundle } from '../helpers/contextFactory';
import { useXCollectionState } from '../helpers/XCollection';
import { arrayToRecord } from '../helpers/typeHelpers';

export type ViewMode = 'threads' | 'messages';

export type IDataCache = {
  loading: boolean;
  viewMode: ViewMode;
  switchViewMode: (nextMode: ViewMode) => void;
  refreshCurrentView: () => Promise<void>;

  fetchMessages: (page: number, pageSize: number, force?: boolean) => Promise<void>;
  messageHeadersCache: GMessage[];
  getCachedMessageDetails: (emailId: string) => Promise<GMessage>;
  setCachedEmail: (email: GMessage) => void;
  selectedEmail: GMessage | null;
  setSelectedEmail: (email: GMessage | null) => void;
  messageAttachments: Map<string, Attachment[]>;
  inlineAttachments: Map<string, Record<string, InlineAttachment>>;
  totalMessages: number;
  currentPageMessages: GMessage[];
  updatePageMessage: (email: GMessage) => void;

  checkedRowIds: GridRowSelectionModel;
  setCheckedRowIds: (selection: GridRowSelectionModel) => void;
  markCheckedRowIdsAsRead: (asRead: boolean) => Promise<void>;
  trashThreadById: (threadId: string) => Promise<void>;
  labels: {
    sortedFiltered: ExtendedLabel[];
    byId: (key: string | undefined) => ExtendedLabel | undefined;
    patchLabelItem: (label: ExtendedLabel, value: Partial<ExtendedLabel>) => void;
  };
  settingsEditMode: boolean;
  setSettingsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedLabelId: string | undefined;
  setSelectedLabelId: (labelId: string) => void;
  activeTotalRows: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: (pageSize: number) => void;

  fetchThreads: (page: number, pageSize: number, force?: boolean) => Promise<void>;
  getCachedThreadMessages: (threadId: string) => Promise<GMessage[]>;
  totalThreads: number;
  currentPageThreads: GThreadHeader[];
  updatePageThread: (threadId: string, patch: Partial<GThreadHeader>) => void;
};

const { Provider: DataCacheProvider, useCtx: useDataCache } = createContextBundle<IDataCache>();

export { useDataCache };

const createEmptySelection = (): GridRowSelectionModel => ({ type: 'include', ids: new Set() });
const stalePagedRequest = Symbol('stalePagedRequest');

type PagedRequestScope = {
  isCurrent: () => boolean;
  ensureCurrent: () => void;
  commit: (action: () => void) => boolean;
};

const getInitialViewMode = (): ViewMode => {
  const mode = new URLSearchParams(window.location.search).get('mode');
  return mode === 'messages' ? 'messages' : 'threads';
};

const applyReadState = (message: GMessage, asRead: boolean): GMessage => ({
  ...message,
  labelIds: asRead
    ? (message.labelIds ?? []).filter(labelId => labelId !== 'UNREAD')
    : Array.from(new Set([...(message.labelIds ?? []), 'UNREAD'])),
});

const getSelectionIds = (selection: GridRowSelectionModel): string[] =>
  selection.type === 'include' ? Array.from(selection.ids) as string[] : [];

const removeIdFromSelection = (selection: GridRowSelectionModel, id: string): GridRowSelectionModel => {
  if (selection.type !== 'include' || !selection.ids.has(id)) return selection;

  const nextIds = new Set(selection.ids);
  nextIds.delete(id);
  return { ...selection, ids: nextIds };
};

export const DataCacheProviderComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [settingsEditMode, setSettingsEditMode] = useState(false);
  const [viewMode] = useState<ViewMode>(getInitialViewMode);

  const [messageHeadersCache, setMessageHeadersCache] = useState<GMessage[]>([]);
  const messageDetailsCache = useRef<Record<string, GMessage>>({});
  const setCachedEmail = (email: GMessage) => {
    messageDetailsCache.current[email.id] = email;
  };
  const [selectedEmail, setSelectedEmail] = useState<GMessage | null>(null);

  const [messageAttachments, setEmailAttachments] = useState<Map<string, Attachment[]>>(new Map());
  const [inlineAttachments, setInlineAttachments] = useState<Map<string, Record<string, InlineAttachment>>>(new Map());

  // Gmail API uses pageToken, so we track tokens for each page separately for message and thread mode.
  const [messagePageTokens, setMessagePageTokens] = useState<Array<string | null>>([null]);
  const [totalMessages, setTotalMessages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSizeState] = useState<number>(-1);
  const messageHeadersCacheRef = useRef<GMessage[]>([]);
  const messagePageTokensRef = useRef<Array<string | null>>([null]);
  const totalMessagesRef = useRef<number>(0);

  const [threadRefsCache, setThreadRefsCache] = useState<GThread[]>([]);
  const threadDetailsCache = useRef<Record<string, GMessage[]>>({});
  const threadHeaderDetailsCache = useRef<Record<string, GThreadHeader>>({});
  const inflightThreadHeaderIds = useRef<Set<string>>(new Set());
  const [threadPageTokens, setThreadPageTokens] = useState<Array<string | null>>([null]);
  const [totalThreads, setTotalThreads] = useState<number>(0);
  const [threadHeaderCacheVersion, setThreadHeaderCacheVersion] = useState(0);
  const threadRefsCacheRef = useRef<GThread[]>([]);
  const threadPageTokensRef = useRef<Array<string | null>>([null]);
  const totalThreadsRef = useRef<number>(0);

  const inflightFetchKeys = useRef<Set<string>>(new Set());
  const pagedViewVersion = useRef(0);

  const createPagedRequestScope = useCallback((): PagedRequestScope => {
    const requestVersion = pagedViewVersion.current;
    const isCurrent = () => pagedViewVersion.current === requestVersion;

    return {
      isCurrent,
      ensureCurrent: () => {
        if (!isCurrent()) throw stalePagedRequest;
      },
      commit: (action: () => void) => {
        if (!isCurrent()) return false;
        action();
        return true;
      },
    };
  }, []);

  // Kind of a stretch to bring MUI row-selection state in here, but this remains the shared list selection source.
  const [checkedRowIds, setCheckedRowIds] = useState<GridRowSelectionModel>(createEmptySelection);

  const labelCollection = useXCollectionState<string, ExtendedLabel, string>(
    'id',
    // Sort function: take customized sort first, otherwise sort by name with system labels up top.
    label => ('000' + (label.sortNum ?? 9999)).slice(-4) + '~' + (label.isSystem ? '0' : '1') + '~' + label.displayName.toLowerCase(),
    label => label.isVisible,
    !settingsEditMode
  );

  const [selectedLabelId, setSelectedLabelIdState] = useState<string>();

  useEffect(() => {
    messageHeadersCacheRef.current = messageHeadersCache;
  }, [messageHeadersCache]);

  useEffect(() => {
    messagePageTokensRef.current = messagePageTokens;
  }, [messagePageTokens]);

  useEffect(() => {
    totalMessagesRef.current = totalMessages;
  }, [totalMessages]);

  useEffect(() => {
    threadRefsCacheRef.current = threadRefsCache;
  }, [threadRefsCache]);

  useEffect(() => {
    threadPageTokensRef.current = threadPageTokens;
  }, [threadPageTokens]);

  useEffect(() => {
    totalThreadsRef.current = totalThreads;
  }, [totalThreads]);

  // On mount, fetch Gmail labels and merge with persisted visibility/order preferences.
  useEffect(() => {
    gMailApi.getApiLabels().then(gmailLabels => {
      labelCollection.setEntries(buildExtendedLabels(
        gmailLabels,
        getFromLocalStorage<Record<string, boolean>>(SettingName.SYSTEM_LABEL_VISIBILITY) ?? {},
        getFromLocalStorage<Record<string, number>>(SettingName.LABEL_ORDER) ?? {}
      ));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetPagedViewState = useCallback(() => {
    pagedViewVersion.current += 1;
    inflightFetchKeys.current.clear();
    messageHeadersCacheRef.current = [];
    threadRefsCacheRef.current = [];
    messagePageTokensRef.current = [null];
    threadPageTokensRef.current = [null];
    totalMessagesRef.current = 0;
    totalThreadsRef.current = 0;
    setMessageHeadersCache([]);
    setThreadRefsCache([]);
    setMessagePageTokens([null]);
    setThreadPageTokens([null]);
    setTotalMessages(0);
    setTotalThreads(0);
    setCurrentPage(0);
    setCheckedRowIds(createEmptySelection());
    setSelectedEmail(null);
    threadHeaderDetailsCache.current = {};
    inflightThreadHeaderIds.current.clear();
    setThreadHeaderCacheVersion(version => version + 1);
  }, []);

  const setSelectedLabelId = useCallback((labelId: string) => {
    if (labelId === selectedLabelId) return;
    resetPagedViewState();
    setSelectedLabelIdState(labelId);
  }, [resetPagedViewState, selectedLabelId]);

  const setPageSize = useCallback((nextPageSize: number) => {
    if (pageSize === nextPageSize) return;

    // Gmail page tokens are tied to the list query shape, so changing page size invalidates the token chain.
    resetPagedViewState();
    setPageSizeState(nextPageSize);
  }, [pageSize, resetPagedViewState]);

  const patchLabelItem = useCallback((existing: ExtendedLabel, patch: Partial<ExtendedLabel>) => {
    labelCollection.patchItem(existing, patch);

    if (patch.isVisible !== undefined) {
      // Save user label visibility changes to the Google backend so the official Gmail UI reflects them as well.
      // Unfortunately Google doesn't provide a public API to change visibility of system labels.
      // Nugget: some system labels do survive the set-visibility API call, but this code intentionally treats them consistently.
      if (!existing.isSystem) gMailApi.setApiLabelVisibility(existing.id, patch.isVisible ? 'labelShow' : 'labelHide');

      // Save hidden system labels to local storage since those can't be persisted to the Google backend.
      else saveToLocalStorage<Record<string, boolean>>(SettingName.SYSTEM_LABEL_VISIBILITY,
        arrayToRecord(labelCollection.sortedFiltered.filter(label => label.isSystem && !label.isVisible), 'id', 'isVisible')!);
    } else if (patch.sortNum !== undefined) {
      // Persist sort order changes by merging the moved label back into the stored LABEL_ORDER map.
      const existingOrder = getFromLocalStorage<Record<string, number>>(SettingName.LABEL_ORDER) ?? {};

      // Persist the one that was just moved...
      existingOrder[existing.id] = patch.sortNum;

      // ...and all the others that were previously stored.
      Object.keys(existingOrder).forEach(existingKey => existingOrder[existingKey] = (labelCollection.byId(existingKey)! as Expando).__$sortedIndex!);
      saveToLocalStorage<Record<string, number>>(SettingName.LABEL_ORDER, existingOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processEmailAttachments = useCallback((emails: GMessage[]) => {
    const attachmentsMap = new Map<string, Attachment[]>();
    const inlineAttachmentsMap = new Map<string, Record<string, InlineAttachment>>();

    emails.forEach(email => {
      if (hasAttachments(email) && email.payload && email.id) {
        const attachments = extractAttachments(email.payload);
        if (attachments.length > 0) attachmentsMap.set(email.id, attachments);
      }

      if (email.payload && email.id) {
        const inline = extractInlineAttachments(email.id, email.payload);
        if (Object.keys(inline).length > 0) inlineAttachmentsMap.set(email.id, inline);
      }
    });

    setEmailAttachments(attachmentsMap);
    setInlineAttachments(inlineAttachmentsMap);
  }, []);

  const getCachedMessageDetails = useCallback(async (messageId: string) => {
    let message = messageDetailsCache.current[messageId];
    if (!message) {
      message = await gMailApi.getApiMessageDetailsById(messageId);
      messageDetailsCache.current[message.id] = message;
      const thread = await gMailApi.getApiThreadMessages(message.threadId);
      threadDetailsCache.current[message.threadId] = thread;
      processEmailAttachments(thread);
    }
    return message;
  }, [processEmailAttachments]);

  const getCachedThreadMessages = useCallback(async (threadId: string) => {
    let threadMessages = threadDetailsCache.current[threadId];
    if (!threadMessages) {
      threadMessages = await gMailApi.getApiThreadMessages(threadId);
      threadDetailsCache.current[threadId] = threadMessages;
      threadMessages.forEach(message => {
        messageDetailsCache.current[message.id] = message;
      });
      processEmailAttachments(threadMessages);
    }
    return threadMessages;
  }, [processEmailAttachments]);

  const enrichThreadHeaders = useCallback(async (threadRefs: GThread[]) => {
    const missingIds = threadRefs
      .map(thread => thread.id)
      .filter(threadId => !threadHeaderDetailsCache.current[threadId] && !inflightThreadHeaderIds.current.has(threadId));

    if (!missingIds.length) return;

    missingIds.forEach(threadId => inflightThreadHeaderIds.current.add(threadId));
    try {
      const headers = await gMailApi.getApiThreadHeadersByIds(missingIds);
      headers.forEach(header => {
        threadHeaderDetailsCache.current[header.id] = header;
      });
      setThreadHeaderCacheVersion(version => version + 1);
    } finally {
      missingIds.forEach(threadId => inflightThreadHeaderIds.current.delete(threadId));
    }
  }, []);

  const fetchMessages = useCallback(async (page: number, nextPageSize: number, force = false): Promise<void> => {
    if (nextPageSize === -1 || !selectedLabelId) return;

    const requestScope = createPagedRequestScope();
    const requestKey = `messages:${selectedLabelId}:${page}:${nextPageSize}:${force ? 'force' : 'cache'}`;
    if (inflightFetchKeys.current.has(requestKey)) return;

    const start = page * nextPageSize;
    const end = start + nextPageSize;
    const cacheSlice = messageHeadersCacheRef.current.slice(start, end);
    const cacheHit = !force && cacheSlice.length === nextPageSize && cacheSlice.every(Boolean) && end <= totalMessagesRef.current;

    if (cacheHit) {
      setLoading(false);
      return;
    }

    setLoading(true);
    inflightFetchKeys.current.add(requestKey);
    try {
      let tokens = [...messagePageTokensRef.current];
      while (tokens.length <= page) {
        const prevResult = await gMailApi.getApiMessages(selectedLabelId, nextPageSize, tokens[tokens.length - 1]);
        requestScope.ensureCurrent();
        tokens = [...tokens, prevResult.nextPageToken || null];
      }

      requestScope.commit(() => {
        messagePageTokensRef.current = tokens;
        setMessagePageTokens(tokens);
      });

      const result = await gMailApi.getApiMessages(selectedLabelId, nextPageSize, tokens[page] ?? null);
      requestScope.commit(() => {
        totalMessagesRef.current = result.total;
        setTotalMessages(result.total);
        setMessageHeadersCache(prev => {
          const nextCache = [...prev];
          for (let index = 0; index < result.emails.length; index++) {
            nextCache[start + index] = result.emails[index];
          }
          messageHeadersCacheRef.current = nextCache;
          return nextCache;
        });
      });
    } catch (error) {
      if (error === stalePagedRequest) return;
      requestScope.commit(() => {
        messageHeadersCacheRef.current = [];
        totalMessagesRef.current = 0;
        setMessageHeadersCache([]);
        setTotalMessages(0);
      });
    } finally {
      inflightFetchKeys.current.delete(requestKey);
      requestScope.commit(() => setLoading(false));
    }
  }, [createPagedRequestScope, selectedLabelId]);

  const fetchThreads = useCallback(async (page: number, nextPageSize: number, force = false): Promise<void> => {
    if (nextPageSize === -1 || !selectedLabelId) return;

    const requestScope = createPagedRequestScope();
    const requestKey = `threads:${selectedLabelId}:${page}:${nextPageSize}:${force ? 'force' : 'cache'}`;
    if (inflightFetchKeys.current.has(requestKey)) return;

    const start = page * nextPageSize;
    const end = start + nextPageSize;
    const cacheSlice = threadRefsCacheRef.current.slice(start, end);
    const cacheHit = !force && cacheSlice.length === nextPageSize && cacheSlice.every(Boolean) && end <= totalThreadsRef.current;

    if (cacheHit) {
      setLoading(false);
      return;
    }

    setLoading(true);
    inflightFetchKeys.current.add(requestKey);
    try {
      let tokens = [...threadPageTokensRef.current];
      while (tokens.length <= page) {
        const prevResult = await gMailApi.getApiThreadsByLabelId(selectedLabelId, nextPageSize, tokens[tokens.length - 1]);
        requestScope.ensureCurrent();
        tokens = [...tokens, prevResult.nextPageToken || null];
      }

      requestScope.commit(() => {
        threadPageTokensRef.current = tokens;
        setThreadPageTokens(tokens);
      });

      const result = await gMailApi.getApiThreadsByLabelId(selectedLabelId, nextPageSize, tokens[page] ?? null);
      requestScope.commit(() => {
        const nextTotalThreads = typeof result.resultSizeEstimate === 'number' ? result.resultSizeEstimate : 0;
        totalThreadsRef.current = nextTotalThreads;
        setTotalThreads(nextTotalThreads);
        setThreadRefsCache(prev => {
          const nextCache = [...prev];
          for (let index = 0; index < (result.threads ?? []).length; index++) {
            nextCache[start + index] = result.threads[index];
          }
          threadRefsCacheRef.current = nextCache;
          return nextCache;
        });
      });

      requestScope.ensureCurrent();
      await enrichThreadHeaders(result.threads ?? []);
    } catch (error) {
      if (error === stalePagedRequest) return;
      requestScope.commit(() => {
        threadRefsCacheRef.current = [];
        totalThreadsRef.current = 0;
        setThreadRefsCache([]);
        setTotalThreads(0);
      });
    } finally {
      inflightFetchKeys.current.delete(requestKey);
      requestScope.commit(() => setLoading(false));
    }
  }, [createPagedRequestScope, enrichThreadHeaders, selectedLabelId]);

  useEffect(() => {
    if (viewMode === 'messages') fetchMessages(currentPage, pageSize);
    else fetchThreads(currentPage, pageSize);
  }, [currentPage, fetchMessages, fetchThreads, pageSize, selectedLabelId, viewMode]);

  const currentPageMessages = useMemo(() => {
    if (pageSize === -1) return [];
    const start = currentPage * pageSize;
    return messageHeadersCache.slice(start, start + pageSize);
  }, [currentPage, messageHeadersCache, pageSize]);

  const updatePageMessage = useCallback((updatedEmail: GMessage) => {
    setMessageHeadersCache(prev => prev.map(email => email?.id === updatedEmail.id ? { ...email, ...updatedEmail } : email));
    messageDetailsCache.current[updatedEmail.id] = { ...(messageDetailsCache.current[updatedEmail.id] ?? updatedEmail), ...updatedEmail };
    setSelectedEmail(prev => prev?.id === updatedEmail.id ? { ...prev, ...updatedEmail } : prev);
  }, []);

  const currentPageThreadRefs = useMemo(() => {
    if (pageSize === -1) return [];
    const start = currentPage * pageSize;
    return threadRefsCache.slice(start, start + pageSize);
  }, [currentPage, pageSize, threadRefsCache]);

  useEffect(() => {
    if (viewMode !== 'threads' || !currentPageThreadRefs.length) return;
    enrichThreadHeaders(currentPageThreadRefs);
  }, [currentPageThreadRefs, enrichThreadHeaders, viewMode]);

  const currentPageThreads = useMemo(() => {
    void threadHeaderCacheVersion;
    return currentPageThreadRefs
      .map(thread => threadHeaderDetailsCache.current[thread.id])
      .filter((thread): thread is GThreadHeader => thread !== undefined);
  }, [currentPageThreadRefs, threadHeaderCacheVersion]);

  const updatePageThread = useCallback((threadId: string, patch: Partial<GThreadHeader>) => {
    const existingThread = threadHeaderDetailsCache.current[threadId];
    if (!existingThread) return;
    threadHeaderDetailsCache.current[threadId] = { ...existingThread, ...patch };
    setThreadHeaderCacheVersion(version => version + 1);
  }, []);

  const trashThreadById = useCallback(async (threadId: string) => {
    if (!threadId) return;

    const existingThreadIndex = threadRefsCacheRef.current.findIndex(thread => thread?.id === threadId);
    if (existingThreadIndex === -1) return;

    const existingThreadRef = threadRefsCacheRef.current[existingThreadIndex];
    const existingThreadHeader = threadHeaderDetailsCache.current[threadId];
    const existingThreadDetails = threadDetailsCache.current[threadId];
    const wasSelected = checkedRowIds.type === 'include' && checkedRowIds.ids.has(threadId);

    setThreadRefsCache(prev => {
      const nextCache = [...prev];
      nextCache.splice(existingThreadIndex, 1);
      threadRefsCacheRef.current = nextCache;
      return nextCache;
    });
    delete threadHeaderDetailsCache.current[threadId];
    delete threadDetailsCache.current[threadId];
    setThreadHeaderCacheVersion(version => version + 1);
    setTotalThreads(prev => {
      const nextTotalThreads = Math.max(0, prev - 1);
      totalThreadsRef.current = nextTotalThreads;
      return nextTotalThreads;
    });
    setCheckedRowIds(prev => removeIdFromSelection(prev, threadId));

    try {
      await gMailApi.trashThread(threadId);
    } catch (error) {
      if (existingThreadRef) {
        setThreadRefsCache(prev => {
          if (prev.some(thread => thread?.id === threadId)) return prev;

          const nextCache = [...prev];
          nextCache.splice(existingThreadIndex, 0, existingThreadRef);
          threadRefsCacheRef.current = nextCache;
          return nextCache;
        });
      }

      if (existingThreadHeader) threadHeaderDetailsCache.current[threadId] = existingThreadHeader;
      if (existingThreadDetails) threadDetailsCache.current[threadId] = existingThreadDetails;
      setThreadHeaderCacheVersion(version => version + 1);
      setTotalThreads(prev => {
        const nextTotalThreads = prev + 1;
        totalThreadsRef.current = nextTotalThreads;
        return nextTotalThreads;
      });

      if (wasSelected) {
        setCheckedRowIds(prev => {
          if (prev.type !== 'include') return prev;
          const nextIds = new Set(prev.ids);
          nextIds.add(threadId);
          return { ...prev, ids: nextIds };
        });
      }

      throw error;
    }
  }, [checkedRowIds]);

  const markCheckedRowIdsAsRead = useCallback(async (asRead: boolean) => {
    const ids = getSelectionIds(checkedRowIds);
    if (!ids.length) return;

    if (viewMode === 'messages') {
      await gMailApi.markMessageIdsAsRead(ids, asRead);
      const selectedIds = new Set(ids);
      setMessageHeadersCache(prev => prev.map(email => selectedIds.has(email.id) ? applyReadState(email, asRead) : email));
      setSelectedEmail(prev => prev && selectedIds.has(prev.id) ? applyReadState(prev, asRead) : prev);
    } else {
      await gMailApi.markThreadIdsAsRead(ids, asRead);
      const selectedIds = new Set(ids);
      selectedIds.forEach(threadId => {
        const existingThread = threadHeaderDetailsCache.current[threadId];
        if (!existingThread) return;
        threadHeaderDetailsCache.current[threadId] = {
          ...existingThread,
          hasUnread: !asRead,
          latestMessage: applyReadState(existingThread.latestMessage, asRead),
        };
      });
      setThreadHeaderCacheVersion(version => version + 1);
    }

    setCheckedRowIds(createEmptySelection());
  }, [checkedRowIds, viewMode]);

  const refreshCurrentView = useCallback(async () => {
    if (viewMode === 'messages') await fetchMessages(currentPage, pageSize, true);
    else {
      threadHeaderDetailsCache.current = {};
      inflightThreadHeaderIds.current.clear();
      setThreadHeaderCacheVersion(version => version + 1);
      await fetchThreads(currentPage, pageSize, true);
    }
  }, [currentPage, fetchMessages, fetchThreads, pageSize, viewMode]);

  const switchViewMode = useCallback((nextMode: ViewMode) => {
    if (nextMode === viewMode) return;
    const nextUrl = new URL(window.location.href);
    nextUrl.pathname = '/';
    nextUrl.searchParams.set('mode', nextMode);
    nextUrl.hash = '';
    window.location.assign(nextUrl.toString());
  }, [viewMode]);

  const value: IDataCache = {
    loading,
    viewMode,
    switchViewMode,
    refreshCurrentView,

    fetchMessages,
    messageHeadersCache,
    getCachedMessageDetails,
    setCachedEmail,
    selectedEmail,
    setSelectedEmail,
    messageAttachments,
    inlineAttachments,
    totalMessages,
    currentPageMessages,
    updatePageMessage,

    checkedRowIds,
    setCheckedRowIds,
    markCheckedRowIdsAsRead,
    trashThreadById,
    labels: { sortedFiltered: labelCollection.sortedFiltered, byId: labelCollection.byId, patchLabelItem },
    settingsEditMode,
    setSettingsEditMode,
    selectedLabelId,
    setSelectedLabelId,
    activeTotalRows: viewMode === 'messages' ? totalMessages : totalThreads,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,

    fetchThreads,
    getCachedThreadMessages,
    totalThreads,
    currentPageThreads,
    updatePageThread,
  };

  return <DataCacheProvider value={value}>{children}</DataCacheProvider>;
};

interface PersistedLabelSettings { sortNum: number; isVisible: boolean; }

export type ExtendedLabel = Omit<GLabel, 'labelListVisibility' | 'type'> & PersistedLabelSettings & {
  isSystem: boolean;
  displayName: string;
  icon?: React.ReactElement<typeof SvgIcon>;
};

const mainLabelIcons: Record<string, React.ReactElement<typeof SvgIcon>> = {
  INBOX: <InboxIcon sx={{ fontSize: 18 }} />,
  SENT: <SendIcon sx={{ fontSize: 18 }} />,
  DRAFT: <DescriptionIcon sx={{ fontSize: 18 }} />,
  SPAM: <ReportIcon sx={{ fontSize: 18 }} />,
  TRASH: <DeleteIcon sx={{ fontSize: 18 }} />,
  IMPORTANT: <StarOutlineIcon sx={{ fontSize: 18 }} />,
};

const buildLabelDisplayName = (labelRawName: string): string => {
  let displayName = labelRawName.replace(/^CATEGORY_/, '').replace(/_/g, ' ');
  displayName = displayName.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  return displayName;
};

const buildExtendedLabels = (gLabels: GLabel[], storedVis: Record<string, boolean>, storedOrder: Record<string, number>) =>
  gLabels.map(label => {
    const isSystem = label.type === 'system';
    const stored = storedVis[label.id];
    const backend = label.labelListVisibility === undefined || !(label.labelListVisibility !== 'labelShow');

    return [label.id, {
      id: label.id,
      name: label.name,
      displayName: buildLabelDisplayName(label.name),
      icon: mainLabelIcons[label.id],
      sortNum: storedOrder[label.id],
      isVisible: isSystem ? (stored ?? backend) : (backend ?? stored),
      isSystem,
    }] as [string, ExtendedLabel];
  });