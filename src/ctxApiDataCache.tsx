import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import gMailApi, { GLabel, GMessage } from './gMailApi';
import { SettingName } from './ctxSettings';
import { getFromLocalStorage, saveToLocalStorage } from './helpers/browserStorage';
import InboxIcon from '@mui/icons-material/Inbox';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import ReportIcon from '@mui/icons-material/Report';
import DescriptionIcon from '@mui/icons-material/Description';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import { SvgIcon } from '@mui/material';
import { GridRowSelectionModel } from '@mui/x-data-grid';
import { Attachment, extractAttachments, extractInlineAttachments, hasAttachments, InlineAttachment } from './helpers/emailParser';
import { createContextBundle } from "./helpers/contextFactory";
import { useXCollectionState } from './helpers/multiIndex';
import { arrayToRecord } from './helpers/typeHelpers';


export type ApiDataCacheType = {
  loading: boolean;
  fetchMessages: (page: number, pageSize: number) => Promise<void>;
  messageHeadersCache: GMessage[];
  getCachedMessageDetails: (emailId: string) => Promise<GMessage>;
  messageAttachments: Map<string, Attachment[]>;
  inlineAttachments: Map<string, Record<string, InlineAttachment>>;
  threadMessages: GMessage[];

  setCachedEmail: (email: GMessage) => void;

  selectedEmail: GMessage | null;
  setSelectedEmail: (email: GMessage | null) => void;

  checkedMessageIds: GridRowSelectionModel;
  setCheckedMessageIds: (selection: GridRowSelectionModel) => void;
  markCheckedMessageIdsAsRead: (asRead: boolean) => void;

  labels: {
    sortedFiltered: ExtendedLabel[],
    byId: (key: string | undefined) => ExtendedLabel | undefined,
    patchLabelItem: (label: ExtendedLabel, value: Partial<ExtendedLabel>) => void
  };

  labelSettingsEditMode: boolean;
  setLabelSettingsEditMode: React.Dispatch<React.SetStateAction<boolean>>;

  selectedLabelId: string | undefined;
  setSelectedLabelId: (labelId: string) => void;

  totalMessages: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  currentPageMessages: GMessage[];
  updatePageMessage: (email: GMessage) => void;
};

const { Provider: ApiDataCacheProvider, useCtx: useApiDataCache } = createContextBundle<ApiDataCacheType>();

export { useApiDataCache };

export const ApiDataCacheProviderComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [loading, setLoading] = useState<boolean>(false);

  const [messageHeadersCache, setMessageHeadersCache] = useState<Array<GMessage>>([]);
  const messageDetailsCache = useRef<Record<string, GMessage>>({});

  const setCachedEmail = (email: GMessage) => messageDetailsCache.current[email.id!] = email;

  const [selectedEmail, setSelectedEmail] = useState<GMessage | null>(null);

  // Gmail API uses pageToken, so we track tokens for each page
  const [pageTokens, setPageTokens] = useState<Array<string | null>>([null]);
  const [totalMessages, setTotalMessages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(-1);

  // kindof a stretch to bring MUI type in here
  const [checkedMessageIds, setCheckedMessageIds] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });

  const [labelSettingsEditMode, setLabelSettingsEditMode] = useState(false);
  const labelCollection = useXCollectionState<string, ExtendedLabel, string>("id", "displayName", label => label.isVisible, !labelSettingsEditMode);

  const patchLabelItem = useCallback((existing: ExtendedLabel, patch: Partial<ExtendedLabel>) => {
    labelCollection.patchItem(existing, patch);

    // save user label visibility settings to google backend so official gMail UI reflects changes as well
    //   unfortunately google doesn't provide a public API to change visibility of system labels
    if (patch.isVisible !== undefined) {

      // save user level visibility changes to google backend
      if (!existing.isSystem) gMailApi.setApiLabelVisibility(existing.id, patch.isVisible ? 'labelShow' : 'labelHide');

      // save hidden system labels to local storage since those can't be saved to google backend
      else saveToLocalStorage<Record<string, boolean>>(SettingName.LABEL_VISIBILITY,
        arrayToRecord(labelCollection.sortedFiltered.filter(l => l.isSystem && !l.isVisible), "id", "isVisible")!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedLabelId, setSelectedLabelId] = useState<string>();

  const [messageAttachments, setEmailAttachments] = useState<Map<string, Attachment[]>>(new Map());
  const [inlineAttachments, setInlineAttachments] = useState<Map<string, Record<string, InlineAttachment>>>(new Map());

  const [threadMessages, _setThreadMessages] = useState<GMessage[]>([]);

  // On mount, fetch Gmail labels and merge with visibility
  useEffect(() => {
    gMailApi.getApiLabels().then(gmailLabels => {
      labelCollection.setEntries(buildExtendedLabels(
        gmailLabels,
        getFromLocalStorage<Record<string, boolean>>(SettingName.LABEL_VISIBILITY) ?? {}
      ));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    setMessageHeadersCache([]);
    setPageTokens([null]);
    setTotalMessages(0);
    setCurrentPage(0);
  }, [selectedLabelId]);


  const markCheckedMessageIdsAsRead = (/*asRead: boolean*/) => {
    //   gMailApi.markMessageIdsAsRead(Array.from(checkedMessageIds.ids) as string[], asRead).then(() => {
    //     updatePageMessage({
    //       ...selectedEmail,
    //       labelIds: selectedEmail?.labelIds?.filter(l => l !== 'UNREAD') ?? [],

    //       setCheckedMessageIds({ type: 'include', ids: new Set() });
    // });
  };

  //TODO: incorporate grouping messages into threads and giving a threadcount on those in the message list
  //       threadCount: pageEmails.filter((e: gmail_Message) => e.threadId && email.threadId && e.threadId === email.threadId).length

  const fetchMessages = useCallback(async (page: number, pageSize: number): Promise<void> => {

    if (pageSize === -1 || !selectedLabelId) { return; }

    // Check cache: only skip fetch if all emails for this page are present AND the page is within totalEmails
    const start = page * pageSize;
    const end = start + pageSize;
    const cacheSlice = messageHeadersCache.slice(start, end);
    const cacheHit = cacheSlice.length === pageSize && cacheSlice.every(e => !!e) && end <= totalMessages;

    if (cacheHit) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Use pageTokens to get the correct pageToken for this page
      const token = pageTokens[page];

      // If we don't have a token for this page, fetch previous pages to get it
      while (pageTokens.length <= page) {
        // Fetch previous page to get nextPageToken
        const prevToken = pageTokens[pageTokens.length - 1];
        const prevResult = await gMailApi.getApiMessages(selectedLabelId, pageSize, prevToken);
        setPageTokens(tokens => [...tokens, prevResult.nextPageToken || null]);
      }

      // Now fetch the actual page
      const result = await gMailApi.getApiMessages(selectedLabelId, pageSize, token);
      setTotalMessages(result.total);

      // Fill the cache at the correct indices
      setMessageHeadersCache(prev => {
        const newCache = [...prev];
        const start = page * pageSize;
        for (let i = 0; i < result.emails.length; ++i) {
          newCache[start + i] = result.emails[i];
        }
        return newCache;
      });

    } catch {

      setMessageHeadersCache([]);
      setTotalMessages(0);

    } finally {
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabelId, pageTokens]);


  const currentPageMessages = useMemo(() => {
    if (!messageHeadersCache || pageSize === -1) return [];

    const start = currentPage * pageSize;
    return messageHeadersCache.slice(start, start + pageSize);
  }, [currentPage, messageHeadersCache, pageSize]);



  useEffect(() => { fetchMessages(currentPage, pageSize); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, pageSize, selectedLabelId]
  );

  const updatePageMessage = (updatedEmail: GMessage) => {
    setMessageHeadersCache(prev => prev.map((email) =>
      email && email.id === updatedEmail.id ? { ...email, ...updatedEmail } : email
    ));
  };


  const getCachedMessageDetails = async (messageId: string) => {
    let message = messageDetailsCache.current[messageId];
    if (!message) {
      message = await gMailApi.getApiMessageDetailsById(messageId);
      messageDetailsCache.current[message.id!] = message;
      const thread = await gMailApi.getApiThreadMessages(message.threadId);
      //TODO:setEmailThread(thread);
      processEmailAttachments(thread);

    }
    return message;
  }



  // Extract attachments from emails and update state
  const processEmailAttachments = (emails: GMessage[]) => {
    const attachmentsMap = new Map<string, Attachment[]>();
    const inlineAttachmentsMap = new Map<string, Record<string, InlineAttachment>>();

    emails.forEach((email: GMessage) => {
      if (hasAttachments(email) && email.payload && email.id) {
        const attachments = extractAttachments(email.payload);
        if (attachments.length > 0) {
          attachmentsMap.set(email.id, attachments);
        }
      }
      if (email.payload && email.id) {
        const inline = extractInlineAttachments(email.id, email.payload);
        if (Object.keys(inline).length > 0) {
          inlineAttachmentsMap.set(email.id, inline);
        }
      }
    });

    setEmailAttachments(attachmentsMap);
    setInlineAttachments(inlineAttachmentsMap);
  };

  const value: ApiDataCacheType = {
    loading,
    fetchMessages,
    messageHeadersCache,
    getCachedMessageDetails,
    messageAttachments,
    inlineAttachments,
    threadMessages,
    checkedMessageIds,
    setCheckedMessageIds,
    markCheckedMessageIdsAsRead,

    labels: { sortedFiltered: labelCollection.sortedFiltered, byId: labelCollection.byId, patchLabelItem },

    labelSettingsEditMode,
    setLabelSettingsEditMode,

    selectedLabelId,
    setSelectedLabelId,

    totalMessages,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    currentPageMessages,
    updatePageMessage,

    setCachedEmail,
    selectedEmail,
    setSelectedEmail
  };

  return <ApiDataCacheProvider value={value}>{children}</ApiDataCacheProvider>;

};

interface PersistedLabelSettings { sortNum: number, isVisible: boolean };

export type ExtendedLabel = Omit<GLabel, "labelListVisibility" | "type"> & PersistedLabelSettings & {
  isSystem: boolean;
  displayName: string;
  icon?: React.ReactElement<typeof SvgIcon>;
};


const mainLabelIcons: Record<string, React.ReactElement<typeof SvgIcon>> = {
  'INBOX': <InboxIcon sx={{ fontSize: 18 }} />,
  'SENT': <SendIcon sx={{ fontSize: 18 }} />,
  'DRAFT': <DescriptionIcon sx={{ fontSize: 18 }} />,
  'SPAM': <ReportIcon sx={{ fontSize: 18 }} />,
  'TRASH': <DeleteIcon sx={{ fontSize: 18 }} />,
  'IMPORTANT': <StarOutlineIcon sx={{ fontSize: 18 }} />,
};

const buildLabelDisplayName = (labelRawName: string): string => {
  let displayName = labelRawName.replace(/^CATEGORY_/, '').replace(/_/g, ' ');
  displayName = displayName.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  return displayName;
};

const buildExtendedLabels = (gLabels: GLabel[], storedVis: Record<string, boolean>) =>
  // build array of [key, value] entries for BTree constructor
  gLabels.map(l => {
    const isSystem = l.type === "system";;
    const stored = storedVis[l.id];
    const backend = l.labelListVisibility === undefined || !(l.labelListVisibility !== "labelShow");

    return [l.id, {
      id: l.id,
      name: l.name,

      displayName: buildLabelDisplayName(l.name),
      icon: mainLabelIcons[l.id],

      // sortNum: storedVis[l.id]?.sortNum,
      isVisible: isSystem ? (stored ?? backend) : (backend ?? stored), //system labels don't update to googles backend so take anything from local storage first and vice versa
      isSystem

    }] as [string, ExtendedLabel];
  });