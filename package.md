engines: {
  pnpm: '>=9.0.0', // makes sure we don't inadvertently use npm or yarn
}
devDependencies: {
  '@types/google.accounts': '^0.0.18', //all the nested types under window.google.accounts namespace
  'google-auth-library': '^10.5.0', //this is ONLY to provide type TokenPayload for gAuthApi.tsx
}
