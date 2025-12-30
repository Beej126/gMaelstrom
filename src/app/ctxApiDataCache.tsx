import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { getEmails, getGmailLabels, gmail_Label } from './gMailApi';
import { getFromStorage } from '../helpers/browserStorage';


const genLabelDisplayName = (labelRawName: string): string => {
  let displayName = labelRawName.replace(/^CATEGORY_/, '').replace(/_/g, ' ');
  displayName = displayName.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  return displayName;
};


const ApiDataCacheContext = createContext<{
  loading: boolean;
  refreshing: boolean;

  fetchEmails: (page: number, pageSize: number) => Promise<void>;
  emails: gapi.client.gmail.Message[];
  getPageEmails: (page: number, pageSize: number) => gapi.client.gmail.Message[];
  updatePageEmail: (email: gapi.client.gmail.Message) => void;

  getCachedEmail: (id: string) => gapi.client.gmail.Message | null;
  setCachedEmail: (email: gapi.client.gmail.Message) => void;

  selectedEmail: gapi.client.gmail.Message | null;
  setSelectedEmail: (email: gapi.client.gmail.Message | null) => void;

  labels: Record<string, ExtendedLabel>;
  setLabels: (labels: Record<string, ExtendedLabel>) => void;

  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;

  totalEmails: number;

  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;

  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;

  combineThreads: boolean;
  setCombineThreads: (combine: boolean) => void;

} | undefined>(undefined);


export const useApiDataCache = () => {
  const context = useContext(ApiDataCacheContext);
  if (context === undefined) {
    throw new Error('useApiDataCache must be used within an ApiDataCacheProvider');
  }
  return context;
};

interface ApiDataCacheProviderProps {
  children: ReactNode;
}


const labelMap: Record<string, string> = {
  'Inbox': 'INBOX',
  'Sent': 'SENT',
  'Drafts': 'DRAFT',
  'Spam': 'SPAM',
  'Trash': 'TRASH',
};

// ExtendedLabel merges Gmail label data with visibility
export type ExtendedLabel = gmail_Label & {
  displayName: string;
  visible: boolean
};


export const ApiDataCacheProvider: React.FC<ApiDataCacheProviderProps> = ({ children }) => {

  // Category state must be declared before useEffect that uses it
  const [selectedCategory, setSelectedCategory] = useState<string>('Inbox');
  // Flat cache for all emails (by absolute index)
  const [emailCache, setEmailCache] = useState<Array<gapi.client.gmail.Message | undefined>>([]);
  // Expose emails as a filtered version of emailCache (no undefined)
  const emails: gapi.client.gmail.Message[] = emailCache.filter((e): e is gapi.client.gmail.Message => !!e);
  // Gmail API uses pageToken, so we track tokens for each page
  const [pageTokens, setPageTokens] = useState<Array<string | null>>([null]);
  const [totalEmails, setTotalEmails] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(-1);

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<gapi.client.gmail.Message | null>(null);
  const [categories] = useState<string[]>(['Inbox', 'Sent', 'Drafts', 'Spam', 'Trash']);
  // (removed duplicate declaration)

  // Helper to get/set full email details in cache (by id)
  const emailDetailsCache = useRef<{ [id: string]: gapi.client.gmail.Message }>({});
  const getCachedEmail = (id: string) => emailDetailsCache.current[id] || null;
  const setCachedEmail = (email: gapi.client.gmail.Message) => {
    if (email && email.id) emailDetailsCache.current[email.id] = email;
  };

  // Initialize combineThreads from localStorage or default to false
  const [combineThreads, setCombineThreads] = useState<boolean>(() => {
    const savedValue = localStorage.getItem('gMaelstrom_combineThreads');
    return savedValue ? savedValue === 'true' : false;
  });


  const [labels, setLabels] = useState<Record<string, ExtendedLabel>>({});

  // Helper to build Record<string, ExtendedLabel> from array
  const buildLabelRecord = (arr: gmail_Label[], vis: Record<string, boolean>): Record<string, ExtendedLabel> => {
    const rec: Record<string, ExtendedLabel> = {};
    for (const l of arr) {
      const displayName = genLabelDisplayName(l.name);
      rec[displayName] = { ...l, displayName, visible: vis[l.id] !== false };
    }
    return rec;
  };

  // On mount, fetch Gmail labels and merge with visibility
  useEffect(() => {
    getGmailLabels().then(gmailLabels => {
      const vis = getFromStorage<Record<string, boolean>>('gMaelstrom_labelVisibility') ?? {};
      setLabels(buildLabelRecord(gmailLabels, vis));
    });
  }, []);

  // Persist only {id: visible} to localStorage when labels change
  useEffect(() => {
    const vis: Record<string, boolean> = {};
    for (const l of Object.values(labels)) vis[l.id] = !!l.visible;
    localStorage.setItem('gMaelstrom_labelVisibility', JSON.stringify(vis));
  }, [labels]);



  // Update localStorage when combineThreads changes
  useEffect(() => {
    localStorage.setItem('gMaelstrom_combineThreads', combineThreads.toString());
  }, [combineThreads]);

  // (removed duplicate/old labelVisibility effect and getGmailLabels usage)


  useEffect(() => {
    setEmailCache([]);
    setPageTokens([null]);
    setTotalEmails(0);
    setCurrentPage(0);
  }, [selectedCategory]);


  const fetchEmails = useCallback(async (page: number, pageSize: number): Promise<void> => {

    if (pageSize === -1) { return; }

    // Check cache: only skip fetch if all emails for this page are present AND the page is within totalEmails
    const start = page * pageSize;
    const end = start + pageSize;
    const cacheSlice = emailCache.slice(start, end);
    const cacheHit = cacheSlice.length === pageSize && cacheSlice.every(e => !!e) && end <= totalEmails;

    if (cacheHit) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Map category to Gmail labelId
      const labelId = labelMap[selectedCategory] || 'INBOX';
      // Use pageTokens to get the correct pageToken for this page
      const token = pageTokens[page] || null;

      // If we don't have a token for this page, fetch previous pages to get it
      while (pageTokens.length <= page) {
        // Fetch previous page to get nextPageToken
        const prevToken = pageTokens[pageTokens.length - 1];
        const prevResult = await getEmails(prevToken || undefined, labelId, { maxResults: pageSize });
        setPageTokens(tokens => [...tokens, prevResult.nextPageToken || null]);
      }

      // Now fetch the actual page
      const result = await getEmails(token || undefined, labelId, { maxResults: pageSize });
      setTotalEmails(result.total);

      // Fill the cache at the correct indices
      setEmailCache(prev => {
        const newCache = [...prev];
        const start = page * pageSize;
        for (let i = 0; i < result.emails.length; ++i) {
          newCache[start + i] = result.emails[i];
        }
        return newCache;
      });

    } catch {

      setEmailCache([]);
      setTotalEmails(0);

    } finally {
      setLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, pageTokens]);


  // const lastFetchRef = useRef<{ page: number; pageSize: number; selectedCategory: string }>({ page: -1, pageSize: -1, selectedCategory: '' });

  useEffect(() => { fetchEmails(currentPage, pageSize); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, pageSize, selectedCategory]
  );

  // Helper to get a page of emails from the cache (for DataGrid)
  const getPageEmails = (page: number, pageSize: number): gapi.client.gmail.Message[] => {
    const start = page * pageSize;
    return emailCache.slice(start, start + pageSize).filter((e): e is gapi.client.gmail.Message => !!e);
  };

  const updatePageEmail = (updatedEmail: gapi.client.gmail.Message) => {
    setEmailCache(prev => prev.map((email) =>
      email && email.id === updatedEmail.id ? { ...email, ...updatedEmail } : email
    ));
  };

  return <ApiDataCacheContext.Provider value={({
    loading,
    refreshing,

    fetchEmails,
    emails,
    getPageEmails,
    updatePageEmail,

    selectedEmail,
    setSelectedEmail,

    getCachedEmail,
    setCachedEmail,

    labels,
    setLabels,

    categories,
    selectedCategory,
    setSelectedCategory,

    totalEmails,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,

    combineThreads,
    setCombineThreads,
  })}
  >{children}</ApiDataCacheContext.Provider>;
};