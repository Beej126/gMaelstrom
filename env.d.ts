/// <reference types="@rsbuild/core/types" />

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Enhanced SVG component type declaration with named ReactComponent export
declare module '*.svg' {
  import React from 'react';
  
  // Add the named export for ReactComponent
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & {
    title?: string;
    titleId?: string;
    style?: React.CSSProperties;
    className?: string;
  }>;
  
  // Default export for the URL
  const src: string;
  export default src;
}
