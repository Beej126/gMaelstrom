import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { getEmails, getGmailLabels } from '../services/gmailService';
import { isUserAuthenticated } from '../services/authService';
import { Email } from '../types/email';
import { setDynamicLabelNameMap } from '../components/EmailList';

interface EmailContextType {
  emails: Email[];
  loading: boolean;
  error: string | null;
  selectedEmail: Email | null;
  setSelectedEmail: (email: Email | null) => void;
  fetchEmails: () => Promise<void>;
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
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
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
  const fetchEmails = useCallback(async () => {
    if (!isUserAuthenticated()) {
      setEmails([]);
      setLoading(false);
      return;
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
      const result = await getEmails(null, labelId);
      setEmails(result.emails);
      setPageToken(result.nextPageToken);
      setHasMoreEmails(!!result.nextPageToken);
      setError(null);
    } catch (err: any) {
      setError(`Failed to fetch emails: ${err.message || 'Unknown error'}`);
      console.error('Error fetching emails:', err);
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
    } catch (err: any) {
      setError(`Failed to load more emails: ${err.message || 'Unknown error'}`);
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
  }, [selectedCategory]);

  // Filter emails based on selected category and label
  const filteredEmails = emails.filter(email => {
    if (selectedCategory === 'Inbox') {
      return email.labelIds?.includes('INBOX');
    } else if (selectedCategory === 'Sent') {
      return email.labelIds?.includes('SENT');
    } else if (selectedCategory === 'Drafts') {
      return email.labelIds?.includes('DRAFT');
    } else if (selectedCategory === 'Spam') {
      return email.labelIds?.includes('SPAM');
    } else if (selectedCategory === 'Trash') {
      return email.labelIds?.includes('TRASH');
    }
    // fallback: show all
    return true;
  });

  // If combineThreads is enabled, group emails by threadId
  const processedEmails = combineThreads
    ? Object.values(
        filteredEmails.reduce((threads, email) => {
          // Use the threadId as the key
          const threadId = email.gapiMessage.threadId!;
          
          // Check if this thread already exists
          if (!threads[threadId]) {
            // First email in thread
            threads[threadId] = email;
          } else {
            // If this email is newer than the existing one
            if (new Date(email.date) > new Date(threads[threadId].date)) {
              // Update thread representative with newer email
              threads[threadId] = email;
            }
            
            // Check if this email has attachments and the thread representative doesn't
            if (email.hasAttachments && !threads[threadId].hasAttachments) {
              // Update the thread representative to show it has attachments
              threads[threadId] = {
                ...threads[threadId],
                hasAttachments: true
              };
            }
          }
          return threads;
        }, {} as Record<string, Email>)
      )
    : filteredEmails;

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
    setLabelSettingsOpen
  };

  return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
};