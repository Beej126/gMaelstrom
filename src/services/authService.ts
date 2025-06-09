import { setGmailAccessToken } from './gmailService';
import { gapi } from 'gapi-script';

// Access environment variables directly with full references 
const GOOGLE_CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.PUBLIC_GOOGLE_API_KEY;

// Log for debugging (can be removed in production)
console.log('Credentials loaded:', {
  clientIdExists: !!GOOGLE_CLIENT_ID,
  apiKeyExists: !!API_KEY
});

// Authentication state
let isAuthenticated = false;
let user: any = null;
let gapiInited = false;

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

        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            gapi.load('client:auth2', async () => {
                try {
                    await initClient();
                    gapiInited = true;
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        };
        script.onerror = () => {
            reject(new Error("Failed to load Google API script"));
        };
        document.body.appendChild(script);
    });
};

const initClient = async () => {
    try {
        await (gapi.client as any).init({
            apiKey: API_KEY,
            clientId: GOOGLE_CLIENT_ID,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
            scope: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.modify'
            ].join(' ')
        });

        // Listen for sign-in state changes
        (gapi as any).auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state
        updateSigninStatus((gapi as any).auth2.getAuthInstance().isSignedIn.get());
    } catch (error) {
        console.error('Error initializing Google API client:', error);
    }
};

const updateSigninStatus = (isSignedIn: boolean) => {
    isAuthenticated = isSignedIn;

    if (isSignedIn) {
        user = (gapi as any).auth2.getAuthInstance().currentUser.get().getBasicProfile();
        const authResponse = (gapi as any).auth2.getAuthInstance().currentUser.get().getAuthResponse(true);
        const accessToken = authResponse.access_token;

        // Set the access token for Gmail service
        setGmailAccessToken(accessToken);

        // Store auth status in localStorage for session persistence
        localStorage.setItem('gMaelstrom_isAuthenticated', 'true');
    } else {
        user = null;
        localStorage.removeItem('gMaelstrom_isAuthenticated');
    }
};

export const signIn = () => {
    if (!gapiInited) {
        console.error('Google API not initialized yet');
        return Promise.reject('Google API not initialized yet');
    }
    return (gapi as any).auth2.getAuthInstance().signIn();
};

export const signOut = () => {
    if (!gapiInited) {
        console.error('Google API not initialized yet');
        return Promise.reject('Google API not initialized yet');
    }
    localStorage.removeItem('gMaelstrom_isAuthenticated');
    return (gapi as any).auth2.getAuthInstance().signOut();
};

export const getUser = () => user;

export const isUserAuthenticated = () => {
    // Check if the user is authenticated from state or localStorage
    return isAuthenticated || localStorage.getItem('gMaelstrom_isAuthenticated') === 'true';
};