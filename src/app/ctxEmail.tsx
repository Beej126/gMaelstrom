import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { getEmails, getGmailLabels } from './gmailApi';
import { isUserAuthenticated } from './GAuthApi';
// import { Email } from '../types/email';


interface EmailContextType {
  emails: gapi.client.gmail.Message[];
  loading: boolean;
  error: string | null;
  selectedEmail: gapi.client.gmail.Message | null;
  setSelectedEmail: (email: gapi.client.gmail.Message | null) => void;
  fetchEmails: (page: number, pageSize: number) => Promise<void>;
  loadMoreEmails: () => Promise<void>;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  refreshing: boolean;
  combineThreads: boolean;
  setCombineThreads: (combine: boolean) => void;
  labelVisibility: Record<string, boolean>;
  setLabelVisibility: (vis: Record<string, boolean>) => void;
  labelSettingsOpen: boolean;
  setLabelSettingsOpen: (open: boolean) => void;
  dynamicLabelNameMap: Record<string, string>;
  setDynamicLabelNameMap: (labels: Array<{ id: string; name: string }>) => void;
  updateEmailInContext: (email: gapi.client.gmail.Message) => void;
  getCachedEmail: (id: string) => gapi.client.gmail.Message | null;
  setCachedEmail: (email: gapi.client.gmail.Message) => void;
  totalEmails: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

export const useEmailContext = () => {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error('useEmailContext must be used within an EmailProvider');
  }
  return context;
};

interface EmailProviderProps {
  children: ReactNode;
}


export const EmailProvider: React.FC<EmailProviderProps> = ({ children }) => {
  // Flat cache for all emails (by absolute index)
  const [emailCache, setEmailCache] = useState<Array<gapi.client.gmail.Message | undefined>>([]);
  // Expose emails as a filtered version of emailCache (no undefined)
  const emails: gapi.client.gmail.Message[] = emailCache.filter((e): e is gapi.client.gmail.Message => !!e);
  // Gmail API uses pageToken, so we track tokens for each page
  const [pageTokens, setPageTokens] = useState<Array<string | null>>([null]);
  const [totalEmails, setTotalEmails] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<gapi.client.gmail.Message | null>(null);
  const [categories] = useState<string[]>(['Inbox', 'Sent', 'Drafts', 'Spam', 'Trash']);
  const [selectedCategory, setSelectedCategory] = useState<string>('Inbox');

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

  // Removed unused pageToken and setPageToken
  // Removed unused hasMoreEmails and setHasMoreEmails

  // Initialize labelVisibility from localStorage
  const [labelVisibility, setLabelVisibility] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('gMaelstrom_labelVisibility') || '{}');
    } catch {
      return {};
    }
  });

  const [labelSettingsOpen, setLabelSettingsOpen] = useState(false);
  const [dynamicLabelNameMap, _setDynamicLabelNameMap] = useState<Record<string, string>>({});

  const setDynamicLabelNameMap = (labelDefs: Array<{ id: string; name: string }>) => {
    const map: Record<string, string> = {};
    labelDefs.forEach(label => {
      map[label.id] = label.name;
    });
    _setDynamicLabelNameMap(map);
  };

  // Update localStorage when combineThreads changes
  useEffect(() => {
    localStorage.setItem('gMaelstrom_combineThreads', combineThreads.toString());
  }, [combineThreads]);

  // Save labelVisibility to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('gMaelstrom_labelVisibility', JSON.stringify(labelVisibility));
  }, [labelVisibility]);

  // Fetch Gmail labels on mount
  useEffect(() => {
    async function fetchLabels() {
      if (!isUserAuthenticated()) return;
      try {
        const labelDefs = await getGmailLabels();
        setDynamicLabelNameMap(labelDefs);
      } catch (err) {
        console.error('Failed to fetch Gmail labels:', err);
      }
    }
    fetchLabels();
  }, []);

  // New: fetchEmails(page, pageSize) for true server-side paging and flat cache
  const fetchEmails = useCallback(async (page: number, pageSize: number): Promise<void> => {
    console.log('[fetchEmails] called', { page, pageSize, selectedCategory, pageTokens, loading });
    const authed = isUserAuthenticated();
    console.log('[fetchEmails] isUserAuthenticated:', authed, 'loading', loading);
    if (!authed) {
      setEmailCache([]);
      setTotalEmails(0);
      setLoading(false);
      return;
    }
    // Check cache: only skip fetch if all emails for this page are present AND the page is within totalEmails
    const start = page * pageSize;
    const end = start + pageSize;
    const cacheSlice = emailCache.slice(start, end);
    const cacheHit = cacheSlice.length === pageSize && cacheSlice.every(e => !!e) && end <= totalEmails;
    if (cacheHit) {
      console.log('[fetchEmails] cache hit for page', page);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Map category to Gmail labelId
      const labelMap: Record<string, string> = {
        'Inbox': 'INBOX',
        'Sent': 'SENT',
        'Drafts': 'DRAFT',
        'Spam': 'SPAM',
        'Trash': 'TRASH',
      };
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
      setError(null);
    } catch (err) {
      setError(`Failed to fetch emails: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTotalEmails(0);
      console.error('Error fetching emails:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, pageTokens, loading]);

  // Deprecated: loadMoreEmails (no-op for flat cache)
  const loadMoreEmails = useCallback(async () => {}, []);

  useEffect(() => {
    // Only try to fetch emails if user is authenticated
    if (!isUserAuthenticated()) {
      setEmailCache([]);
      setTotalEmails(0);
      setLoading(false);
    }
  }, [fetchEmails]);

  
  // Helper to get a page of emails from the cache (for DataGrid)
  const getPageEmails = (page: number, pageSize: number): gapi.client.gmail.Message[] => {
    const start = page * pageSize;
    return emailCache.slice(start, start + pageSize).filter((e): e is gapi.client.gmail.Message => !!e);
  };

  const updateEmailInContext = (updatedEmail: gapi.client.gmail.Message) => {
    setEmailCache(prev => prev.map((email) =>
      email && email.id === updatedEmail.id ? { ...email, ...updatedEmail } : email
    ));
  };

  const value: EmailContextType & { getPageEmails: (page: number, pageSize: number) => gapi.client.gmail.Message[] } = {
    emails,
    getPageEmails,
    loading,
    error,
    selectedEmail,
    setSelectedEmail,
    fetchEmails,
    loadMoreEmails,
    categories,
    selectedCategory,
    setSelectedCategory,
    refreshing,
    combineThreads,
    setCombineThreads,
    labelVisibility,
    setLabelVisibility,
    labelSettingsOpen,
    setLabelSettingsOpen,
    dynamicLabelNameMap,
    setDynamicLabelNameMap,
    updateEmailInContext,
    getCachedEmail,
    setCachedEmail,
    totalEmails,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize
  };

  return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
};