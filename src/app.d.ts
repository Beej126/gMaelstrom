
// provides "import.meta.env." prefix to reference .env-file based variables (e.g. PUBLIC_GOOGLE_CLIENT_ID)
/// <reference types="@rsbuild/core/types" />


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

// basically a stand in for "any" that avoid the implicit any compiler warning
interface Expando {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}