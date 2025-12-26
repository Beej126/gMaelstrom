import { getFromStorage, saveToStorage } from "../helpers/browserStorage";
import { useEffect, useState } from "react";
import { TokenPayload } from 'google-auth-library';
// import { toast } from "react-toastify";

const GOOGLE_CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.PUBLIC_GOOGLE_API_KEY;

export function useUser() {
    const [user, setUser] = useState<AuthedUser>();
    useEffect(() => {
        getAuthedUser()
            // .catch(ex => {
            //     toast.error(ex.message);
            // })
            .finally(() => setUser(authedUser!));
    }, []);
    return user;
}

export type AuthedUser = Required<Pick<TokenPayload, "name" | "given_name" | "family_name" | "email" | "picture">> & {
    authFailed: boolean; // Indicates login attempt failed
    accessToken: string; //used for all api calls bearer token
    initials: string; //derived from given_name + family_name
};

let authedUser: AuthedUser | null = null;
/**
 * sets global getAuthedUser() regardless of returns .authedFailed = true if sign-in fails/cancelled to give specifically timed indicator (via useUser hook) for UI to display failure
 * Returns the current authed user when succeeds
 * throws exception on error so the calling stack immediately dies, code callers based on success, no "if failed" checks
 * pass refreshToken=true to force a token refresh
 * attempts sign-in flow if necessary to re-authenticate
 */
export const getAuthedUser = async (refreshToken: boolean = false): Promise<AuthedUser> => {

    if (refreshToken) setAuthedUser({ authFailed: false, accessToken: '', name: '', given_name: '', family_name: '', initials: '', email: '', picture: '' });

    if (authedUser?.accessToken) return authedUser;

    authedUser = getFromStorage<AuthedUser>('gMaelstrom_authedUser');
    if (authedUser?.accessToken) return authedUser;

    // Try to sign in
    await ensureSignedIn(); //calls setAuthedUser internally, so after await, authedUser will be populated for sure
    return authedUser!;
};

const setAuthedUser = (authed: AuthedUser | null) => {
    if (authed) authed.initials = (authed.given_name.charAt(0) + authed.family_name.charAt(0)).toUpperCase();
    authedUser = authed;
    saveToStorage('gMaelstrom_authedUser', { ...authed, authFailed: false }); //never save failed to storage so page refresh always retries =)
};

// --- GIS Initialization and Sign-In ---
let signInPromise: Promise<void> | null = null;

/**
 * Ensures GIS is loaded and user is signed in. Handles both one-tap and fallback popup flows.
 * Stores user profile and access token in localStorage.
 */
const ensureSignedIn = async (): Promise<void> => {

    if (signInPromise) return signInPromise;

    signInPromise = (async () => {
        // 1. Load GIS script and initialize
        if (!window.google?.accounts?.id) {
            await new Promise<void>((resolve, reject) => {
                if (!GOOGLE_CLIENT_ID) {
                    reject(new Error("Google Client ID is not populated. Environment variables might not be loading correctly."));
                    return;
                }
                if (!API_KEY) {
                    reject(new Error("Google API Key is not populated. Environment variables might not be loading correctly."));
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.onload = () => {
                    try {
                        window.google.accounts.id.initialize({
                            client_id: GOOGLE_CLIENT_ID,
                            callback: () => { } // no-op
                        });
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
        }

        // 2. Prompt for sign-in
        await new Promise<void>((resolve, reject) => {

            // window.google.accounts.id.prompt() is googles "one-tap" prompt, just a floating button without requiring any creds input or redirects
            window.google.accounts.id.prompt((notification: google.accounts.id.PromptMomentNotification) => {
                // FedCM-compliant: use notification.momentType (Federated Credential Management)
                (async () => {
                    try {
                        if (notification.momentType === 'skipped' || notification.momentType === 'not_displayed') {
                            // **** Fallback: show popup and get token ****
                            const token = await getToken();
                            const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            if (!res.ok) throw new Error('Failed to fetch user profile');
                            const profile = await res.json();
                            setAuthedUser({ authFailed: false, accessToken: token, ...profile });
                            resolve();
                        } else if (notification.momentType === 'display') {
                            // One-tap: decode JWT, then get token
                            window.google.accounts.id.initialize({
                                client_id: GOOGLE_CLIENT_ID,
                                callback: async (response: google.accounts.id.CredentialResponse) => {
                                    try {
                                        const profile = JSON.parse(atob(response.credential.split('.')[1]));
                                        const token = await getToken();
                                        setAuthedUser({ authFailed: false, accessToken: token, ...profile });
                                        resolve();
                                    } catch (err) {
                                        reject(err);
                                    }
                                }
                            });
                        }
                        // else: handle other momentTypes if needed
                    } catch (err) {
                        reject(err);
                    }
                })();
            });
        });
    })();

    try {
        await signInPromise
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (ex: any) {
        setAuthedUser({ authFailed: true, accessToken: '', name: '', given_name: '', family_name: '', initials: '', email: '', picture: '' });
        throw new Error(`Sign-in failed: ${ex.message}`);
    }
    finally {
        signInPromise = null;
    }
};


/**
 * Requests a Gmail OAuth2 access token using GIS. Returns the token string.
 */
const getToken = () => new Promise<string>((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google OAuth2 not initialized'));
        return;
    }
    window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'profile',
            'email'
        ].join(' '),
        callback: (tr: google.accounts.oauth2.TokenResponse) => resolve(tr.access_token),
        error_callback: (err: google.accounts.oauth2.ClientConfigError) => {
            // potential err.type's ['popup_closed', 'popup_failed_to_open']
            reject(new Error(err.type));
        }
    }).requestAccessToken();
});



/**
 * Signs out the user and clears authentication state.
 */
export const signOut = (): Promise<void> => {
    return new Promise((resolve) => {
        if (window.google?.accounts?.id) {
            window.google.accounts.id.disableAutoSelect();
        }
        setAuthedUser(null);
        resolve();
    });
};


declare global {
    interface Window {
        google: {
            accounts: typeof google.accounts;
        };
    }
}
