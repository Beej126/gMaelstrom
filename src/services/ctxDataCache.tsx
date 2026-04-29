import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import gMailApi, { GLabel, GMessage, GThread, GThreadHeader, GThreadWithMessages } from './gMailApi';
import { gmailApiThreadBatchFetch } from './gMailApiThreadBatchFetch';
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
import { Attachment, extractAttachments, extractInlineAttachments, getMessageDateValue, hasAttachments, InlineAttachment } from '../helpers/emailParser';
import { createContextBundle } from '../helpers/contextFactory';
import { useXCollectionState } from '../helpers/XCollection';
import { arrayToRecord } from '../helpers/typeHelpers';

export type IDataCache = {
  loading: boolean;
  refreshCurrentView: () => Promise<void>;

  messageAttachments: Map<string, Attachment[]>;
  inlineAttachments: Map<string, Record<string, InlineAttachment>>;

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
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: (pageSize: number) => void;

  getCachedThreadMessages: (threadId: string) => Promise<GMessage[]>;
  totalThreads: number;
  currentPageThreads: GThreadHeader[];
  updatePageThread: (threadId: string, patch: Partial<GThreadHeader>) => void;
  setCachedThreadReadState: (threadId: string, asRead: boolean) => void;
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

const applyReadState = (message: GMessage, asRead: boolean): GMessage => ({
  ...message,
  labelIds: asRead
    ? (message.labelIds ?? []).filter(labelId => labelId !== 'UNREAD')
    : Array.from(new Set([...(message.labelIds ?? []), 'UNREAD'])),
});

const buildThreadHeader = (thread: GThreadWithMessages): GThreadHeader | null => {
  const messages = (thread.messages ?? []).filter(
    (message): message is GMessage =>
      !!message &&
      typeof message.id === 'string' &&
      typeof message.threadId === 'string' &&
      typeof message.snippet === 'string' &&
      Array.isArray(message.labelIds)
  );

  if (!messages.length) return null;

  const orderedMessages = [...messages].sort((left, right) => getMessageDateValue(left) - getMessageDateValue(right));
  const latestMessage = orderedMessages[orderedMessages.length - 1] ?? messages[messages.length - 1];
  return {
    id: thread.id,
    snippet: thread.snippet,
    latestMessage,
    labelIds: Array.from(new Set(messages.flatMap(message => message.labelIds ?? []))),
    messageCount: messages.length,
    hasUnread: messages.some(message => (message.labelIds ?? []).includes('UNREAD')),
    hasAttachments: messages.some(message => hasAttachments(message)),
  };
};

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

  const [messageAttachments, setEmailAttachments] = useState<Map<string, Attachment[]>>(new Map());
  const [inlineAttachments, setInlineAttachments] = useState<Map<string, Record<string, InlineAttachment>>>(new Map());

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSizeState] = useState<number>(-1);

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
    let cancelled = false;

    const loadLabels = async () => {
      const gmailLabels = await gMailApi.getApiLabels();
      const detailedLabels = [];

      for (const label of gmailLabels) {
        detailedLabels.push(await gMailApi.getApiLabel(label.id));
        if (cancelled) return;
      }

      if (cancelled) return;

      labelCollection.setEntries(buildExtendedLabels(
        detailedLabels,
        getFromLocalStorage<Record<string, boolean>>(SettingName.SYSTEM_LABEL_VISIBILITY) ?? {},
        getFromLocalStorage<Record<string, number>>(SettingName.LABEL_ORDER) ?? {}
      ));
    };

    void loadLabels();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetPagedViewState = useCallback(() => {
    pagedViewVersion.current += 1;
    inflightFetchKeys.current.clear();
    threadRefsCacheRef.current = [];
    threadPageTokensRef.current = [null];
    totalThreadsRef.current = 0;
    setThreadRefsCache([]);
    setThreadPageTokens([null]);
    setTotalThreads(0);
    setCurrentPage(0);
    setCheckedRowIds(createEmptySelection());
    threadDetailsCache.current = {};
    threadHeaderDetailsCache.current = {};
    inflightThreadHeaderIds.current.clear();
    setEmailAttachments(new Map());
    setInlineAttachments(new Map());
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

  const adjustLabelUnreadCounts = useCallback((labelIds: string[], delta: number) => {
    if (!delta) return;

    for (const labelId of labelIds) {
      const existingLabel = labelCollection.byId(labelId);
      if (!existingLabel) continue;

      labelCollection.patchItem(existingLabel, {
        unreadThreadCount: Math.max(0, (existingLabel.unreadThreadCount ?? 0) + delta),
      });
    }
  }, [labelCollection]);

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

  const syncThreadHeaderAttachmentState = useCallback((threadId: string, threadMessages: GMessage[]) => {
    const existingThreadHeader = threadHeaderDetailsCache.current[threadId];
    if (!existingThreadHeader) return;

    const nextHasAttachments = threadMessages.some(message => hasAttachments(message));
    if (existingThreadHeader.hasAttachments === nextHasAttachments) return;

    threadHeaderDetailsCache.current[threadId] = {
      ...existingThreadHeader,
      hasAttachments: nextHasAttachments,
    };
    setThreadHeaderCacheVersion(version => version + 1);
  }, []);

  const getCachedThreadMessages = useCallback(async (threadId: string) => {
    let threadMessages = threadDetailsCache.current[threadId];
    if (!threadMessages) {
      threadMessages = await gMailApi.getApiThreadMessages(threadId);
      threadDetailsCache.current[threadId] = threadMessages;
      processEmailAttachments(threadMessages);
    }
    syncThreadHeaderAttachmentState(threadId, threadMessages);
    return threadMessages;
  }, [processEmailAttachments, syncThreadHeaderAttachmentState]);

  const enrichThreadHeaders = useCallback(async (threadRefs: GThread[]) => {
    const missingIds = threadRefs
      .map(thread => thread.id)
      .filter(threadId => !threadHeaderDetailsCache.current[threadId] && !inflightThreadHeaderIds.current.has(threadId));

    if (!missingIds.length) return;

    missingIds.forEach(threadId => inflightThreadHeaderIds.current.add(threadId));
    try {
      const headers = (await gmailApiThreadBatchFetch(missingIds))
        .map(buildThreadHeader)
        .filter((thread): thread is GThreadHeader => thread !== null);
      headers.forEach(header => {
        threadHeaderDetailsCache.current[header.id] = header;
      });
      setThreadHeaderCacheVersion(version => version + 1);
    } finally {
      missingIds.forEach(threadId => inflightThreadHeaderIds.current.delete(threadId));
    }
  }, []);

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
    fetchThreads(currentPage, pageSize);
  }, [currentPage, fetchThreads, pageSize, selectedLabelId]);

  const currentPageThreadRefs = useMemo(() => {
    if (pageSize === -1) return [];
    const start = currentPage * pageSize;
    return threadRefsCache.slice(start, start + pageSize);
  }, [currentPage, pageSize, threadRefsCache]);

  useEffect(() => {
    if (!currentPageThreadRefs.length) return;
    enrichThreadHeaders(currentPageThreadRefs);
  }, [currentPageThreadRefs, enrichThreadHeaders]);

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

  const setCachedThreadReadState = useCallback((threadId: string, asRead: boolean) => {
    const existingThread = threadHeaderDetailsCache.current[threadId];
    if (!existingThread) return;

    const nextHasUnread = !asRead;
    if (existingThread.hasUnread !== nextHasUnread) {
      adjustLabelUnreadCounts(existingThread.labelIds ?? [], nextHasUnread ? 1 : -1);
    }

    threadHeaderDetailsCache.current[threadId] = {
      ...existingThread,
      hasUnread: nextHasUnread,
      latestMessage: applyReadState(existingThread.latestMessage, asRead),
    };
    setThreadHeaderCacheVersion(version => version + 1);
  }, [adjustLabelUnreadCounts]);

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
    if (existingThreadHeader?.hasUnread) {
      adjustLabelUnreadCounts(existingThreadHeader.labelIds ?? [], -1);
    }
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
      if (existingThreadHeader?.hasUnread) {
        adjustLabelUnreadCounts(existingThreadHeader.labelIds ?? [], 1);
      }
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
  }, [adjustLabelUnreadCounts, checkedRowIds]);

  const markCheckedRowIdsAsRead = useCallback(async (asRead: boolean) => {
    const ids = getSelectionIds(checkedRowIds);
    if (!ids.length) return;

    await gMailApi.markThreadIdsAsRead(ids, asRead);
    ids.forEach(threadId => setCachedThreadReadState(threadId, asRead));

    setCheckedRowIds(createEmptySelection());
  }, [checkedRowIds, setCachedThreadReadState]);

  const refreshCurrentView = useCallback(async () => {
    threadHeaderDetailsCache.current = {};
    inflightThreadHeaderIds.current.clear();
    setThreadHeaderCacheVersion(version => version + 1);
    await fetchThreads(currentPage, pageSize, true);
  }, [currentPage, fetchThreads, pageSize]);

  const value: IDataCache = {
    loading,
    refreshCurrentView,

    messageAttachments,
    inlineAttachments,

    checkedRowIds,
    setCheckedRowIds,
    markCheckedRowIdsAsRead,
    trashThreadById,
    labels: { sortedFiltered: labelCollection.sortedFiltered, byId: labelCollection.byId, patchLabelItem },
    settingsEditMode,
    setSettingsEditMode,
    selectedLabelId,
    setSelectedLabelId,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,

    getCachedThreadMessages,
    totalThreads,
    currentPageThreads,
    updatePageThread,
    setCachedThreadReadState,
  };

  return <DataCacheProvider value={value}>{children}</DataCacheProvider>;
};

interface PersistedLabelSettings { sortNum: number; isVisible: boolean; }

export type ExtendedLabel = Omit<GLabel, 'labelListVisibility' | 'type'> & PersistedLabelSettings & {
  isSystem: boolean;
  displayName: string;
  unreadThreadCount: number;
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
      unreadThreadCount: label.threadsUnread ?? 0,
      icon: mainLabelIcons[label.id],
      sortNum: storedOrder[label.id],
      isVisible: isSystem ? (stored ?? backend) : (backend ?? stored),
      isSystem,
    }] as [string, ExtendedLabel];
  });