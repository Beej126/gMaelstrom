import { setGmailAccessToken } from './gmailService';

// Access environment variables directly with full references 
const GOOGLE_CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.PUBLIC_GOOGLE_API_KEY;

// TypeScript interfaces for Google Identity Services
interface GoogleCredentialResponse {
    credential: string;
    select_by: string;
}

interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
}

interface GooglePromptNotification {
    isNotDisplayed(): boolean;
    isSkippedMoment(): boolean;
    isDismissedMoment(): boolean;
    getNotDisplayedReason(): string;
    getSkippedReason(): string;
    getDismissedReason(): string;
}

interface GoogleTokenClient {
    requestAccessToken(): void;
}

interface GoogleAccounts {
    id: {
        initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
        prompt(callback?: (notification: GooglePromptNotification) => void): void;
        disableAutoSelect(): void;
    };
    oauth2: {
        initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
        }): GoogleTokenClient;
    };
}

declare global {
    interface Window {
        google: {
            accounts: GoogleAccounts;
        };
    }
}

interface UserProfile {
    getName(): string;
    getEmail(): string;
    getImageUrl(): string;
    getId(): string;
}

// Authentication state
let isAuthenticated = false;
let user: UserProfile | null = null;
let accessToken: string | null = null;

// Restore state from localStorage on load
const storedAuth = localStorage.getItem('gMaelstrom_isAuthenticated');
const storedUser = localStorage.getItem('gMaelstrom_user');
const storedToken = localStorage.getItem('gMaelstrom_accessToken');
if (storedAuth === 'true' && storedUser && storedToken) {
  isAuthenticated = true;
  accessToken = storedToken;
  const payload = JSON.parse(storedUser);
  user = {
    getName: () => payload.name,
    getEmail: () => payload.email,
    getImageUrl: () => payload.picture,
    getId: () => payload.sub
  };
  setGmailAccessToken(accessToken);
}

// Initialize the Google API client
export const initializeGoogleAuth = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Check if credentials are properly configured
        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
            reject(new Error("Google Client ID is not properly configured. Environment variables might not be loading correctly."));
            return;
        }

        if (!API_KEY || API_KEY === "YOUR_GOOGLE_API_KEY_HERE") {
            reject(new Error("Google API Key is not properly configured. Environment variables might not be loading correctly."));
            return;
        }

        // Load Google Identity Services
        // loading via script src is the modern recommended approach vs js package import
        //   this way it is always kept up to date by Google
        // https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#load_the_client_library
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = async () => {
            try {
                await initClient();
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        script.onerror = () => {
            reject(new Error("Failed to load Google Identity Services"));
        };
        document.body.appendChild(script);
    });
};

const initClient = async () => {
  try {
    // Initialize Google Identity Services
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse
    });
    // No need to re-read localStorage here, already done above
  } catch (error) {
    console.error('Error initializing Google API client:', error);
    throw error;
  }
};

const handleCredentialResponse = (response: GoogleCredentialResponse) => {
    // Decode JWT token to get user info
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    
    user = {
        getName: () => payload.name,
        getEmail: () => payload.email,
        getImageUrl: () => payload.picture,
        getId: () => payload.sub
    };

    isAuthenticated = true;
    localStorage.setItem('gMaelstrom_isAuthenticated', 'true');
    localStorage.setItem('gMaelstrom_user', JSON.stringify(payload));
    localStorage.setItem('gMaelstrom_accessToken', response.credential);

    setGmailAccessToken(response.credential);
};

export const signIn = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.id) {
            reject(new Error('Google Identity Services not initialized'));
            return;
        }

        window.google.accounts.id.prompt((notification: GooglePromptNotification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // Fallback to popup
                window.google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: [
                        'https://www.googleapis.com/auth/gmail.readonly',
                        'https://www.googleapis.com/auth/gmail.modify',
                        'profile',
                        'email'
                    ].join(' '),
                    callback: async (tokenResponse: GoogleTokenResponse) => {
                        if (tokenResponse.access_token) {
                            setGmailAccessToken(tokenResponse.access_token);
                            isAuthenticated = true;
                            localStorage.setItem('gMaelstrom_isAuthenticated', 'true');
                            // Fetch user profile from Google userinfo endpoint
                            try {
                                const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
                                    headers: {
                                        Authorization: `Bearer ${tokenResponse.access_token}`
                                    }
                                });
                                if (!res.ok) throw new Error('Failed to fetch user profile');
                                const profile = await res.json();
                                // Store profile in localStorage and update user
                                localStorage.setItem('gMaelstrom_user', JSON.stringify(profile));
                                user = {
                                    getName: () => profile.name,
                                    getEmail: () => profile.email,
                                    getImageUrl: () => profile.picture,
                                    getId: () => profile.sub
                                };
                            } catch {
                                // fallback: store at least email if available
                                localStorage.setItem('gMaelstrom_user', JSON.stringify({ email: '' }));
                                user = {
                                    getName: () => '',
                                    getEmail: () => '',
                                    getImageUrl: () => '',
                                    getId: () => ''
                                };
                            }
                            resolve();
                        } else {
                            reject(new Error('Failed to get access token'));
                        }
                    }
                }).requestAccessToken();
            } else {
                resolve();
            }
        });
    });
};

export const signOut = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    isAuthenticated = false;
    user = null;
    accessToken = null;
    localStorage.removeItem('gMaelstrom_isAuthenticated');
    localStorage.removeItem('gMaelstrom_user');
    localStorage.removeItem('gMaelstrom_accessToken');
    resolve();
  });
};

export const getUser = () => user;

export const isUserAuthenticated = () => {
    // Check if the user is authenticated from state or localStorage
    return isAuthenticated || localStorage.getItem('gMaelstrom_isAuthenticated') === 'true';
};