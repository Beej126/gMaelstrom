engines: {
  pnpm: '>=9.0.0', // makes sure we don't inadvertently use npm or yarn
}
devDependencies: {

  '@types/google.accounts': '^0.0.18', //all the nested types under window.google.accounts namespace
  "googleapis": "^170.1.0", // this has all the GMail types, not used for actually calling APIs, just the return types
  // don't be tempted to load @types/gapi.client.gmail-v1, that corresponds to the deprecated gapi.client vs latest google officially recommended approach of doing REST calls

  "globals": used in eslint.config.mjs
}
