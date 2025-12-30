
// --- RSBuild environment variable types ---
/// <reference types="@rsbuild/core/types" />

// --- Google API TypeScript type definitions ---
// These provide type safety for gapi, gapi.client, and Gmail API objects used in the app
/// <reference types="gapi.client.gmail-v1" />


// // --- ImportMeta interface for environment variables ---
// // Ensures TypeScript recognizes import.meta.env usage for environment variables
// interface ImportMeta {
//   readonly env: ImportMetaEnv;
// }


// --- SVG module declaration for React ---
// Allows importing SVGs as React components and as URLs
declare module '*.svg' {
  import React from 'react';

  // Named export for using SVG as a React component
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & {
    title?: string;
    titleId?: string;
    style?: React.CSSProperties;
    className?: string;
  }>;

  // // Default export for importing SVG as a URL string
  // const src: string;
  // export default src;
}

interface Expando {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}