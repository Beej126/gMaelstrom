Your personal Google Authentication requires one time setup:

1. Go to Google Cloud Console
   1. Visit: https://console.cloud.google.com/
2. Create or Select a Project
   1. Click the project dropdown at the top.
   1. Select an existing project or click "New Project" to create one.
3. Enable Gmail API
   1. In the left sidebar, go to "APIs & Services" > "Library".
   1. Search for "Gmail API".
   1. Click "Gmail API" and then "Enable".
4. Configure OAuth Consent Screen
   1. In "APIs & Services", click "OAuth consent screen".
   1. Choose "External" (for most cases), click "Create".
   1. Fill in the required fields (App name, User support email, Developer contact info).
   1. Save and continue (you can skip scopes and test users for development).
5. Create OAuth 2.0 Client ID
   1. Go to "APIs & Services" > "Credentials".
   1. Click "Create Credentials" > "OAuth client ID".
   1. Choose "Web application".
   1. Set a name (e.g., "gMaelstrom").
   1. Under "Authorized JavaScript origins", add your local URL(s) (e.g., http://localhost:3500 for dev, https://localhost for build).
   1. Under "Authorized redirect URIs", add (if needed) your app's redirect URI.
   1. Click "Create".
   1. Copy the "Client ID" shown to .env file in step #7
6. Create an API Key
   1. In "Credentials", click "Create Credentials" > "API key".
   1. Copy the generated API key shown to .env file in step #7
   1. (Optional but recommended) Click "Restrict key" and limit it to the Gmail API and your app's referrer.
7. copy $/.env-example file to .env and paste in your credentials
   - <mark>**NOTE**: the existing .gitignore safely excludes this file but if you're forking, please MAKE 100% SURE your .env does NOT get committed to your own repo</mark>
   ```
   PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here
   PUBLIC_GOOGLE_API_KEY=your-api-key-here
   ```
8. Define required gmail "scopes"
   1. Go to "APIs & Services" > "Credentials".
   1. Click into your "OAth 2.0 Client ID" link ("gMaelstrom")
   1. Click into "Data Access" on the left menu
   1. Add these to the "Your restricted scopes" at the bottom:
      ```
      ./auth/gmail.readonly
      ./auth/gmail.modify
      ```
9. Set **TEST** Publishing Status and Test Users
   1. again under "APIs & Services" > "Credentials" > "OAth 2.0 Client ID" link
   1. Click "Audience"
   1. Make sure "Publishing status" is set to "Testing"
   1. and add the main gmail address you wish to login under to "Test users" at the bottom