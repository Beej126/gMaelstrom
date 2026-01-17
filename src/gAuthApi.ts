import { getFromSessionStorage, saveToSessionStorage } from "./helpers/browserStorage";
import { useEffect, useState } from "react";
import { TokenPayload } from 'google-auth-library';
import { loadScript } from "./helpers/loadScript";
import { gApiFetchJson } from "./gMailApi";

// overview of Google Auth flow implemented here:
// 
// it may seem a little naive to be reinventing the wheel by implementing OAuth orchestration via the bare metal script google provides
//   when there's probably really good libraries like https://github.com/MomenSherif/react-oauth

//   part of this project for me was the opportunity to experience what the google auth flow really requires to pull off
//     it was cool to discover it's not really that bad - basically just load the script and fire a token request =) see "DoAuth()"
//     so it's nice not to be wondering whether i'm properly aligned with another library and
//     provide my preferred auth function signature to the rest of the app
//
// FYI Google's minimalist "One Tap" auth flow is not used at all here...
//   GMail API calls require a full OAuth access token that carries the authorized permissions of the gmail APIs we want to call.
//     These permissions are requested via the "scopes" provided below in getToken().
//   One Tap only provides an ID token, not enough to make Gmail API calls.
//   The full access token is only provided by the full user consent popup flow,
//      which displays as result of calling requestAccessToken() below.
//
//   fyi, the "One Tap" popup flow happens by calling: window.google.accounts.id.prompt(...)
//     if interested, see old code in $/keep_scraps/gAuthApi-before_removing_one_tap.ts


export function useUser() {
    const [user, setUser] = useState<AuthedUser>();
    useEffect(() => { getAuthedUser().finally(() => setUser(authedUser!)); }, []);
    return user;
}

export type AuthedUser = Required<Pick<TokenPayload, "name" | "given_name" | "family_name" | "email" | "picture">> & {
    authFailed: boolean; // Indicates login attempt failed
    accessToken: string; //used for all api calls' bearer token
    initials: string; //populated for UI convenience
};

let authedUser: AuthedUser | null = null;
const AUTHED_USER_STORAGE_KEY = "authedUser";
/**
 * sets global, cached authedUser variable regardless of success/fail
 * .authedFailed = true when sign-in fails/cancelled as key property to bind UI (via useUser hook)

 * throws exception on error so the calling stack immediately dies
 *   facilitating callers to be cleanly based on assuming success, no "if failed" checks
 
 * gMailApi passes refreshToken=true to force a single token refresh attempt upon 401 Unauthorized error
*/
export const getAuthedUser = async (forceTokenRefresh: boolean = false): Promise<AuthedUser> => {

    if (forceTokenRefresh) {
        saveToSessionStorage(AUTHED_USER_STORAGE_KEY, null);
        authedUser = null;
    }

    if (authedUser?.accessToken) return authedUser;

    // just caching in session storage to survive full page refresh while token is still valid
    authedUser = getFromSessionStorage<AuthedUser>(AUTHED_USER_STORAGE_KEY);
    if (authedUser?.accessToken) return authedUser;

    // Try to sign in
    return doOAuth();
};


// see commments below around loadScript() in tandem with these global Window declarations
// our gsiApi declaration merely overrides some OVERLY OPTIONAL properties the official google type definitions...
//   so calling code doesn't need to be littered with unecessary undefined checks.
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


// signInPromise acts as a mutex to facilitate multiple APIs calls that could fire during initial sign-in...
//   they will all await the same promise if one is already in progress
let signInPromise: Promise<AuthedUser> | null = null;

const doOAuth = async (): Promise<AuthedUser> => {

    if (signInPromise) return signInPromise;

    signInPromise = (async () => {

        authedUser = null; //clear any prior user state

        if (!import.meta.env.PUBLIC_GOOGLE_CLIENT_ID) {
            throw new Error("Google Client ID is not populated in .env file. see setup instructions (readme_google_auth.md)");
        }

        // Load the official GSI client script for logging in
        //   (GSI = Google Identity Services - i guess GIS was already taken =)

        // see Window.google declaration above in tandem with these few lines below...
        //   this is the only spot we want to access the GSI Window.google object directly,
        //   so we need to cast into that being otherwise hidden via global window.google type def above.

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const goog = () => window.google as unknown as any; // implemented as function so we can get fresh value after loadScript completes
        await loadScript(() => !!goog(), 'https://accounts.google.com/gsi/client');
        window.gsiApi = { oauth2: goog().accounts.oauth2, id: goog().accounts.id };

        // this getToken call is what actually pops up the Google "choose account" OAuth dialog and returns with a Gmail access TOKEN
        const token = await getToken();

        // then we fetch the user profile info (i.e. display name, avatar picture, etc)
        const profile = await gApiFetchJson('https://openidconnect.googleapis.com/v1/userinfo', "GET", undefined, token);
        // create an initials property for convenience
        profile.initials = (profile.given_name.charAt(0) + profile.family_name.charAt(0)).toUpperCase();

        authedUser = {
            authFailed: false,
            accessToken: token,
            ...profile
        };
        saveToSessionStorage(AUTHED_USER_STORAGE_KEY, authedUser);

        return authedUser!;
    })();

    try {
        return signInPromise;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (ex: any) {
        //set the failed flag
        authedUser = { authFailed: true, accessToken: '', name: '', given_name: '', family_name: '', initials: '', email: '', picture: '' };
        saveToSessionStorage(AUTHED_USER_STORAGE_KEY, authedUser);
        throw ex;
    } 
};


// Requests a Gmail OAuth2 access token using GSI api. Returns the token string.
const getToken = () => new Promise<string>((resolve, reject) => {
    window.gsiApi?.oauth2.initTokenClient({
        client_id: import.meta.env.PUBLIC_GOOGLE_CLIENT_ID,
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
    authedUser = null;
    window.location.reload();
};
