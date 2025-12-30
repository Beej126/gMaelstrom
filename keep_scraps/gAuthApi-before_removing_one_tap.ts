import { getFromStorage, saveToStorage } from "../helpers/browserStorage";
import { useEffect, useState } from "react";
import { TokenPayload } from 'google-auth-library';
// import { toast } from "react-toastify";

const GOOGLE_CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;

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

// this promise ensures only one sign-in flow happens at a time and rest are held until it resolves
let signInPromise: Promise<void> | null = null;

/**
 * Ensures GIS is loaded and user is signed in. Handles both one-tap and fallback popup flows.
 * Stores user profile and access token in localStorage.
    
    explanation of the authentication flow:

        window.google.accounts.id.prompt() triggers the One Tap UI.
        When the user interacts (or not), Google calls the callback you registered in window.google.accounts.id.initialize().

        If response.credential is present, One Tap succeeded, the credential json is parsed and...
        then getToken() typically completes silently without showing any further UI, because the user is already authenticated.

        If response.credential is not present, it falls through to the else branch which triggers the full popup by calling getToken(), which opens the full Google OAuth popup window.

    Summary:

        Successful One Tap → getToken() is usually silent (no popup).
        Failed One Tap → getToken() triggers the full popup for user interaction.
 */
const ensureSignedIn = async (): Promise<void> => {

    if (signInPromise) return signInPromise;

    signInPromise = (async () => {
        // 1. Load GIS script if needed
        if (!window.google?.accounts?.id) {
            console.log('[gAuthApi] GIS script not loaded, injecting script...');
            await new Promise<void>((resolve, reject) => {
                if (!GOOGLE_CLIENT_ID) {
                    console.error('[gAuthApi] PUBLIC_GOOGLE_CLIENT_ID missing!');
                    reject(new Error("Google Client ID is not populated in .env file. see setup instructions (readme_google_auth.md)"));
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://accounts.google.com/gsi/client';
                script.onload = () => {
                    console.log('[gAuthApi] GIS script loaded.');
                    resolve();
                };
                script.onerror = () => {
                    console.error('[gAuthApi] Failed to load Google Identity Services script.');
                    reject(new Error("Failed to load Google Identity Services"));
                };
                document.body.appendChild(script);
            });
        } else {
            console.log('[gAuthApi] GIS script already loaded.');
        }

        // 2. Initialize GIS with credential callback
        await new Promise<void>((resolve, reject) => {
            let settled = false;
            console.log('[gAuthApi] Initializing GIS with client_id:', GOOGLE_CLIENT_ID);

            // Fallback popup flow for sign-in
            const doPopupFallback = async () => {
                if (settled) return;
                try {
                    console.warn('[gAuthApi] Triggering fallback popup flow for Google sign-in...');
                    const token = await getToken();
                    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!res.ok) {
                        console.error('[gAuthApi] Failed to fetch user profile after One Tap fallback.');
                        settled = true;
                        reject('Failed to fetch user profile');
                        return;
                    }
                    const profile = await res.json();
                    setAuthedUser({ authFailed: false, accessToken: token, ...profile });
                    settled = true;
                    resolve();
                } catch (err) {
                    console.error('[gAuthApi] Error in fallback popup flow:', err);
                    settled = true;
                    reject(err);
                }
            };

            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: async (response: google.accounts.id.CredentialResponse) => {
                    if (settled) return;
                    try {
                        if (response.credential) {
                            const profile = JSON.parse(atob(response.credential.split('.')[1]));
                            console.log('[gAuthApi] One Tap success. calling getToken next... Decoded full response:', response);
                            const token = await getToken();
                            console.log('[gAuthApi] setting authuser global and ending callbacks and resolving promise. getToken result:', token, "profile:", profile);
                            setAuthedUser({ authFailed: false, accessToken: token, ...profile });
                            settled = true;
                            resolve();
                        } else {
                            console.warn('[gAuthApi] One Tap failed. No credential in response. Full response:', response);
                            await doPopupFallback();
                        }
                    } catch (err) {
                        console.error('[gAuthApi] Error in google auth callback:', err);
                        settled = true;
                        reject(err);
                    }
                }
            });

            // 3. Show One Tap prompt with notification logging and fallback
            console.log('[gAuthApi] Calling window.google.accounts.id.prompt()...');
            window.google.accounts.id.prompt((notification: google.accounts.id.PromptMomentNotification) => {
                console.log('[gAuthApi] PromptMomentNotification:', notification, "settled:", settled);

                if (settled) return;

                // Only trigger fallback if:
                // - One Tap is not displayed, skipped, or dismissed for a reason other than 'credential_returned'.
                // - 'credential_returned' means a successful One Tap sign-in just occurred, and GIS will always fire a dismissed notification for this.
                //   We do NOT want to trigger fallback in this case, or we'd get a duplicate popup after a successful sign-in.
                if (
                    notification.isNotDisplayed() ||
                    notification.isSkippedMoment() ||
                    (notification.isDismissedMoment() && notification.getDismissedReason() !== 'credential_returned')
                ) {
                    if (notification.isNotDisplayed()) {
                        console.warn('[gAuthApi] One Tap prompt NOT DISPLAYED. Reason:', notification.getNotDisplayedReason());
                    }
                    if (notification.isSkippedMoment()) {
                        console.warn('[gAuthApi] One Tap prompt SKIPPED. Reason:', notification.getSkippedReason());
                    }
                    if (notification.isDismissedMoment()) {
                        console.warn('[gAuthApi] One Tap prompt DISMISSED. Reason:', notification.getDismissedReason());
                    }
                    doPopupFallback();
                }
            });
        });
    })();

    try {
        await signInPromise;
        console.log('[gAuthApi] signInPromise ended');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (ex: any) {
        console.log('[gAuthApi] signInPromise exception caught:', ex);
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
    console.log('[gAuthApi] getToken begin...');

    if (!window.google?.accounts?.oauth2) {
        console.log('[gAuthApi] getToken - Google OAuth2 not initialized - aborting.');
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
        callback: (tr: google.accounts.oauth2.TokenResponse) => {
            console.log('[gAuthApi] getToken received:', tr);
            resolve(tr.access_token);
        },
        error_callback: (err: google.accounts.oauth2.ClientConfigError) => {
            console.log('[gAuthApi] getToken error:', err);
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
