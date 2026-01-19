import { getFromSessionStorage, saveToSessionStorage } from "./helpers/browserStorage";
import { useEffect, useState } from "react";
import { loadScript } from "./helpers/loadScript";
import { gApiFetchJson } from "./gMailApi";
import type { oauth2_v2 } from "googleapis"; //be SUPER CAREFUL to import only types ... without "type" it could severly expand the runtime bundle size!!
import { StrictRequired } from "./helpers/typeHelpers";

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
//   GMail API calls require a full OAuth access token that carries the authorized permissions of the APIs we want to call.
//     These permissions are requested via the "scopes" provided below in getToken().
//   One Tap only provides an ID token, not enough to make Gmail API calls.
//   The full access token is only provided by the full user consent popup flow,
//      which displays as result of calling requestAccessToken() below.
//   if interested, see old code in $/keep_scraps/gAuthApi-before_removing_one_tap.ts



export function useUser() {
    const [user, setUser] = useState<AuthedUser>();
    useEffect(() => { getAuthedUser().finally(() => setUser(authedUser!)); }, []);
    return user;
}

type GUserInfo = StrictRequired<Pick<oauth2_v2.Schema$Userinfo, "name" | "given_name" | "family_name" | "email" | "picture">>;
export type AuthedUser = GUserInfo & {
    authFailed: boolean; // Indicates login attempt failed
    accessToken: string; //used for all api calls' bearer token
    initials: string; //as alternative when avatar is blank
    expiresAt?: number; // epoch ms when access token expires
};

let authedUser: AuthedUser | null = null;
const AUTHED_USER_STORAGE_KEY = "authedUser";
const hasTokenAndNotExpired = (user: AuthedUser | null) =>
    user?.accessToken &&
    // if we have an expiry, only return cached token when still valid
    // otherwise fall through to refresh token silently
    (!user.expiresAt || user.expiresAt > Date.now() + 5_000);

/**
 * sets global, cached authedUser variable regardless of success/fail
 * .authedFailed = true when sign-in fails/cancelled as key property to bind UI (via useUser hook)

 * throws exception on error so the calling stack immediately dies
 *   facilitating callers to be cleanly based on assuming success, no "if failed" checks
 
 * gMailApi passes refreshToken=true to force a single token refresh attempt upon 401 Unauthorized error
*/
export const getAuthedUser = async (forceTokenRefresh: boolean = false): Promise<AuthedUser> => {
    if (!forceTokenRefresh && hasTokenAndNotExpired(authedUser ??= getFromSessionStorage<AuthedUser>(AUTHED_USER_STORAGE_KEY))) return authedUser!;
    return doOAuth(); // Try to sign in
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


let signInMutex: Promise<AuthedUser> | null = null; // queues multiple APIs calls that fire during initial startup behind the first one
let silentAuthRefreshTime: number | null = null;

const doOAuth = async (): Promise<AuthedUser> => {

    return signInMutex ??= (async () => {

        setAuthedUser(); //clear any prior user state

        if (!import.meta.env.PUBLIC_GOOGLE_CLIENT_ID) {
            throw new Error("Google Client ID is not populated in .env file. see setup instructions (readme_google_auth.md)");
        }

        // Load the official GSI client script for logging in
        //   (GSI = Google Identity Services - i guess GIS was already taken =)

        // see Window.google declaration above in tandem with these few lines below...
        //   this is the only spot we want to access the GSI Window.google object directly,
        //   so we need to cast into that being otherwise hidden via global window.google type def above.

        if (!window.gsiApi) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const goog = () => window.google as unknown as any; // implemented as function so we can get fresh value after loadScript completes
            await loadScript(() => !!goog(), 'https://accounts.google.com/gsi/client');
            window.gsiApi = { oauth2: goog().accounts.oauth2, id: goog().accounts.id };
        }

        // this getToken call is what actually pops up the Google "choose account" OAuth dialog and returns with a Gmail access TOKEN
        const tokenResponse = await requestToken("interactive");

        // then we fetch the user profile info (i.e. display name, avatar picture, etc)
        const userInfo = await gApiFetchJson<GUserInfo>('https://openidconnect.googleapis.com/v1/userinfo', "GET", undefined, tokenResponse.access_token);

        setAuthedUser(tokenResponse, userInfo);
        scheduleSilentRefresh();

        return authedUser!;
    })();

};


// Requests a Gmail OAuth2 access token using GSI api.
// When `interactive` is false we attempt a silent token fetch (no prompt) 
// which succeeds only when Google can return a fresh token without user interaction.
// Caller should fall back to the interactive flow if this rejects.
// nugget: google.accounts types are auto-referenced by typescript's automatic inclusion of all @types packages by default
//         and typescripts @types inclusion can only be whitelisted not blacklisted so it's not practical to exclude @types/google.accounts from the project
const requestToken = (interactive: "interactive" | "silent" = "silent") => new Promise<google.accounts.oauth2.TokenResponse>((resolve, reject) => {
    window.gsiApi?.oauth2.initTokenClient({
        client_id: import.meta.env.PUBLIC_GOOGLE_CLIENT_ID,
        scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'profile',
            'email'
        ].join(' '),
        callback: (tr: google.accounts.oauth2.TokenResponse) => resolve(tr),
        error_callback: (err: google.accounts.oauth2.ClientConfigError) => reject(new Error(err.type))
    }).requestAccessToken(interactive === "interactive" ? undefined : { prompt: 'none' });
});



const silentTokenRefresh = () => {
    clearScheduledRefresh();
    if (!authedUser?.expiresAt) return;

    requestToken("silent").then(tr => {
        if (!authedUser) return; // somehow user signed out meanwhile
        setAuthedUser(tr);
        scheduleSilentRefresh();
    });
};

// Schedule a refresh a 10s before `expiresAt` (ms since epoch).
const scheduleSilentRefresh = () => {
    silentAuthRefreshTime = window.setTimeout(silentTokenRefresh, Math.max(0, (authedUser?.expiresAt ?? 0) - Date.now() - 10_000));
};

const clearScheduledRefresh = () => {
    if (silentAuthRefreshTime !== null) {
        window.clearTimeout(silentAuthRefreshTime);
        silentAuthRefreshTime = null;
    }
};


// passing in blank tokenResponse clears the whole object
//   userInfo should always include tokenResponse as well
//   silent refreshes only pass in tokenResponse and keep existing userInfo
const setAuthedUser = (tokenResponse?: google.accounts.oauth2.TokenResponse, userInfo?: GUserInfo) => {

    // if we don't already have an authedUser object, create a new one with authFailed=true to assume failure until success
    authedUser = (!authedUser || !tokenResponse) ? { authFailed: true, accessToken: '', name: '', given_name: '', family_name: '', initials: '', email: '', picture: '' } : authedUser;

    // userInfo replaces existing object
    if (userInfo) authedUser = {
        ...authedUser,
        ...userInfo as GUserInfo,
        initials: (userInfo.given_name.charAt(0) + userInfo.family_name.charAt(0)).toUpperCase()
    };

    // tokenResponse updates existing object
    if (tokenResponse) {
        authedUser.authFailed = false;
        authedUser.accessToken = tokenResponse?.access_token ?? "";
        authedUser.expiresAt = typeof tokenResponse?.expires_in === 'number' ? Date.now() + (tokenResponse.expires_in * 1000) : undefined;
    }

    saveToSessionStorage(AUTHED_USER_STORAGE_KEY, { ...authedUser, authFailed: false });// never persist authFailed=true so page reload always retries
};


/**
 * Signs out the user and clears authentication state.
 */
export const signOut = () => {
    window.gsiApi?.id.disableAutoSelect();
    setAuthedUser(); //clear user state
    window.location.reload();
};
