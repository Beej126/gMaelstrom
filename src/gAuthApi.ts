import { getFromSessionStorage, saveToSessionStorage } from "./helpers/browserStorage";
import { useEffect, useState } from "react";
import { TokenPayload } from 'google-auth-library';
import { STORAGE_KEY_PREFIX } from "./ctxSettings";
import { loadScript } from "./helpers/loadScript";
import { fetchAuthedJson } from "./helpers/getJson";
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
const AUTHED_USER_STORAGE_KEY = STORAGE_KEY_PREFIX + 'authedUser';
/**
 * sets global getAuthedUser() regardless of success/fail
 * returns .authedFailed = true if sign-in fails/cancelled to provide specifically timed indicator (via useUser hook) for UI to display failure
 * Returns the current authed user when succeeds
 * throws exception on error so the calling stack immediately dies, code callers based on success, no "if failed" checks
 * pass refreshToken=true to force a token refresh
 * attempts sign-in flow if necessary to re-authenticate
 */
export const getAuthedUser = async (refreshToken: boolean = false): Promise<AuthedUser> => {


    if (refreshToken) setAuthedUser({ authFailed: false, accessToken: '', name: '', given_name: '', family_name: '', initials: '', email: '', picture: '' });

    if (authedUser?.accessToken) return authedUser;

    authedUser = getFromSessionStorage<AuthedUser>(AUTHED_USER_STORAGE_KEY);
    if (authedUser?.accessToken) return authedUser;

    // Try to sign in
    await DoOAuth(); //calls setAuthedUser internally, so after await, authedUser will be populated for sure
    return authedUser!;
};

const setAuthedUser = (authed: AuthedUser | null) => {
    if (authed) authed.initials = (authed.given_name.charAt(0) + authed.family_name.charAt(0)).toUpperCase();
    authedUser = authed;
    saveToSessionStorage(AUTHED_USER_STORAGE_KEY, { ...authed, authFailed: false }); //never save failed to storage so page refresh always retries =)
};

// --- GIS Initialization and Sign-In ---

declare global {
    interface Window {
        //sucks we can't really declare .google as optional because typescript **merges** the NON OPTIONAL global @types/google.accounts declaration with it, erasing the optionality arrg!!
        gsiApi?: {
            oauth2: typeof google.accounts.oauth2;
            id: typeof google.accounts.id;
        }
        google: never; //hiding so not used accidentally versus gsiApi
    }
}

// We do NOT use Google One Tap here because this app always needs Gmail API access, which requires a full OAuth access token and user consent for Gmail scopes.
// One Tap only provides an ID token and cannot grant Gmail API access without the popup.
let signInPromise: Promise<void> | null = null;

const DoOAuth = async (): Promise<void> => {

    if (signInPromise) return signInPromise;

    signInPromise = (async () => {

        if (!GOOGLE_CLIENT_ID) {
            throw new Error("Google Client ID is not populated in .env file. see setup instructions (readme_google_auth.md)");
        }

        // Load GIS script
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const goog = () => window.google as unknown as any; // see Window.google declaration above for why
        await loadScript(() => goog(), 'https://accounts.google.com/gsi/client');
        window.gsiApi = { oauth2: goog().accounts.oauth2, id: goog().accounts.id };

        // popup Google "choose account" OAuth flow to get Gmail access token and user profile
        const token = await getToken();

        setAuthedUser({ authFailed: false, accessToken: token, ...await fetchAuthedJson('https://openidconnect.googleapis.com/v1/userinfo', token) });
    })();

    try {
        await signInPromise;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (ex: any) {
        setAuthedUser({ authFailed: true, accessToken: '', name: '', given_name: '', family_name: '', initials: '', email: '', picture: '' });
        throw ex;
    } finally {
        signInPromise = null;
    }
};


/**
 * Requests a Gmail OAuth2 access token using GIS. Returns the token string.
 */
const getToken = () => new Promise<string>((resolve, reject) => {
    window.gsiApi?.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'profile',
            'email'
        ].join(' '),
        callback: (tr: google.accounts.oauth2.TokenResponse) => resolve(tr.access_token),
        error_callback: (err: google.accounts.oauth2.ClientConfigError) => reject(new Error(err.type))
    }).requestAccessToken();
});



/**
 * Signs out the user and clears authentication state.
 */
export const signOut = () => {
    window.gsiApi?.id.disableAutoSelect();
    setAuthedUser(null);
    window.location.reload();
};
