Your personal Google Authentication requires one time setup:

1. Create Project in Google Cloud Console: https://console.cloud.google.com/projectcreate
   1. Project name: **gMaelstrom**
   1. Project ID: {take the default or change if you like}
   1. Location: {your peference - selecting "No organization" is fine}
   1. <kbd>Create</kbd> button
1. Google Auth config: https://console.cloud.google.com/auth
   1. <kbd>Get started</kbd> button
   1. App Information 
      1. App name: **gMaelstrom**
      1. User support email: {your preferred email address, it doesn't get used for anything}
   1. Audience: **Internal** if you can (belong to Google Workspace), otherwise we'll make External work below
   1. Contact Info: {your email}
   1. Finish: [x] "I agree..." checkbox 
   1. <kbd>Create</kbd> button
1. Define required gmail "scopes": https://console.cloud.google.com/auth/scopes
   1. <kbd>Add or remove scopes</kbd> button
   1. Add these to "Your restricted scopes" at the bottom:
      ```
      ./auth/gmail.readonly
      ./auth/gmail.modify
      ```
1. Enable Gmail API - API's & Services > Library: https://console.cloud.google.com/apis/library
   1. in search box at top: **gmail** <kbd>ENTER</kbd>
   1. select **gmail api** 
   1. and select it again on the next page
   1. <kbd>Enable</kbd> button
1. <kbd>Create OAuth client</kbd> button: https://console.cloud.google.com/auth/clients/create
   1. Application type: **Web application**
   1. Name: **gMaelstrom**
   1. Authorized JavaScript origins:
      - **https://localhost:3500** for dev runtime
      - **https://localhost** for build runtime
   1. Authorized redirect URIs: { not needed, leave empty }
   1. <kbd>Create</kbd> button
   1. <mark>*** Copy the "Client ID" shown to .env file in project ***</mark>
      ```
      PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here
      ```
   1. <kbd>OK</kbd> button
   (now on the "OAuth 2.0 Client IDs" page)
1. If you had to choose **EXERNAL** Audience above
   1. under "APIs & Services" > "Credentials" > "OAth 2.0 Client ID" link
   1. Click "Audience"
   1. Make sure "Publishing status" is set to "Testing"
   1. and add the main gmail address you wish to login under to "Test users" at the bottom

---
### An "API Key" is NOT needed for gmail api calls (only a "Client ID")

The API key is typically required for Google services that use public, unauthenticated access (like Maps, some public APIs, or client-side JavaScript libraries). For Gmail and most Google Identity flows in a secure web app, only the OAuth Client ID is actually used for authentication and authorization.

<s>

1. Create an API Key (<kbd>Credentials</kbd> tab on the left): https://console.cloud.google.com/apis/credentials
   1. <kbd>Create credentials</kbd> button at the top
   1. \> <kbd>API key</kbd> option
   1. <mark>*** Copy the generated API key shown to .env file ***</mark>
   1. Optional but consider adding restrictions > <kbd>Edit API key</kbd>

</s>