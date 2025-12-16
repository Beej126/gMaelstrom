import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { getEmails, getGmailLabels } from './GmailApi';
import { isUserAuthenticated } from './GAuthApi';
// import { Email } from '../types/email';

interface EmailContextType {
  emails: gapi.client.gmail.Message[];
  loading: boolean;
  error: string | null;
  selectedEmail: gapi.client.gmail.Message | null;
  setSelectedEmail: (email: gapi.client.gmail.Message | null) => void;
  fetchEmails: () => Promise<gapi.client.gmail.Message[]>;
  loadMoreEmails: () => Promise<void>;
  hasMoreEmails: boolean;
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
  const [emails, setEmails] = useState<gapi.client.gmail.Message[]>([]);
  // In-memory cache for full email details
  const emailCache = useRef<{ [id: string]: gapi.client.gmail.Message }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<gapi.client.gmail.Message | null>(null);

  // Helper to get/set full email details in cache
  const getCachedEmail = (id: string) => emailCache.current[id] || null;
  const setCachedEmail = (email: gapi.client.gmail.Message) => {
    if (email && email.id) emailCache.current[email.id] = email;
  };
  const [categories] = useState<string[]>(['Inbox', 'Sent', 'Drafts', 'Spam', 'Trash']);
  const [selectedCategory, setSelectedCategory] = useState<string>('Inbox');

  // Initialize combineThreads from localStorage or default to false
  const [combineThreads, setCombineThreads] = useState<boolean>(() => {
    const savedValue = localStorage.getItem('gMaelstrom_combineThreads');
    return savedValue ? savedValue === 'true' : false;
  });

  const [pageToken, setPageToken] = useState<string | null>(null);
  const [hasMoreEmails, setHasMoreEmails] = useState<boolean>(true);

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

  // In fetchEmails and loadMoreEmails, use the correct labelIds for each category
  const fetchEmails = useCallback(async (): Promise<gapi.client.gmail.Message[]> => {
    if (!isUserAuthenticated()) {
      setEmails([]);
      setLoading(false);
      return [];
    }

    setRefreshing(true);
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
      const result = await getEmails(undefined, labelId);
      setEmails(result.emails);
      setPageToken(result.nextPageToken);
      setHasMoreEmails(!!result.nextPageToken);
      setError(null);
      return result.emails;
    } catch (err) {
      setError(`Failed to fetch emails: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error fetching emails:', err);
      return [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  const loadMoreEmails = useCallback(async () => {
    if (!pageToken || !isUserAuthenticated()) {
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
      const result = await getEmails(pageToken, labelId);
      setEmails(prevEmails => [...prevEmails, ...result.emails]);
      setPageToken(result.nextPageToken);
      setHasMoreEmails(!!result.nextPageToken);
    } catch (err) {
      setError(`Failed to load more emails: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error loading more emails:', err);
    } finally {
      setLoading(false);
    }
  }, [pageToken, selectedCategory]);

  useEffect(() => {
    // Only try to fetch emails if user is authenticated
    if (isUserAuthenticated()) {
      fetchEmails();
    } else {
      // Clear emails when not authenticated
      setEmails([]);
      setLoading(false);
    }
  }, [fetchEmails]);

  // Reset when changing categories
  useEffect(() => {
    if (isUserAuthenticated()) {
      fetchEmails();
    }
  }, [fetchEmails]);

  // Filter emails based on selected category and label
  const filteredEmails = emails.filter(email => {
      if (selectedCategory === 'Inbox') {
        return (email.labelIds || []).includes('INBOX');
      } else if (selectedCategory === 'Sent') {
        return (email.labelIds || []).includes('SENT');
      } else if (selectedCategory === 'Drafts') {
        return (email.labelIds || []).includes('DRAFT');
      } else if (selectedCategory === 'Spam') {
        return (email.labelIds || []).includes('SPAM');
      } else if (selectedCategory === 'Trash') {
        return (email.labelIds || []).includes('TRASH');
      }
      // fallback: show all
      return true;
  });

  // If combineThreads is enabled, group emails by threadId
  const processedEmails = combineThreads
    ? Object.values(
        filteredEmails.reduce((threads, email) => {
          const threadId = email.threadId;
          if (!threadId) return threads;
          if (!threads[threadId]) {
            threads[threadId] = email;
          } else {
            // Use getDate helper for comparison
            const getDate = (msg: gapi.client.gmail.Message) => {
              const headers = msg.payload?.headers || [];
              const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date');
              return dateHeader?.value ? new Date(dateHeader.value) : new Date(0);
            };
            if (getDate(email) > getDate(threads[threadId])) {
              threads[threadId] = email;
            }
            // Check for attachments
            const hasAttachments = (msg: gapi.client.gmail.Message) => {
              return !!(msg.payload && Array.isArray(msg.payload.parts) && msg.payload.parts.some((part: gapi.client.gmail.MessagePart) => part.filename && part.filename.length > 0));
            };
            if (hasAttachments(email) && !hasAttachments(threads[threadId])) {
              threads[threadId] = email;
            }
          }
          return threads;
        }, {} as Record<string, gapi.client.gmail.Message>)
      )
    : filteredEmails;

  const updateEmailInContext = (updatedEmail: gapi.client.gmail.Message) => {
    setEmails(prevEmails =>
      prevEmails.map((email: gapi.client.gmail.Message) =>
        email.id === updatedEmail.id ? { ...email, ...updatedEmail } : email
      )
    );
  };

  const value = {
    emails: processedEmails,
    loading,
    error,
    selectedEmail,
    setSelectedEmail,
    fetchEmails,
    loadMoreEmails,
    hasMoreEmails,
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
    setCachedEmail
  };

  return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
};