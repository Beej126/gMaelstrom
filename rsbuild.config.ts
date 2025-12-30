import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";
import { pluginSass } from '@rsbuild/plugin-sass';
import fs from 'fs';
import path from 'path';

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
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'localhost-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'localhost-cert.pem')),      
    },
    host: "0.0.0.0",
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