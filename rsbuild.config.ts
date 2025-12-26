import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";
import { pluginSass } from '@rsbuild/plugin-sass';

export default defineConfig({
  source: {
    entry: {
      index: './src/app/index.tsx',
    },
  },

  plugins: [
    pluginReact(),
    pluginSvgr({
      svgrOptions: {
        exportType: 'named',
      },
    }),
    pluginTypeCheck(),
    pluginSass()
  ],

  server: {
    port: 3500,
  },

  html: {
    title: 'gMaelstrom',
    favicon: './public/favicon.svg',
    meta: [
      { name: 'google-identity-services-enable-fedcm', content: 'true' }
    ],
  },
});