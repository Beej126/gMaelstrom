import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginBabel } from '@rsbuild/plugin-babel';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { pluginTypeCheck } from "@rsbuild/plugin-type-check";
import { pluginSass } from '@rsbuild/plugin-sass';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  source: {
    entry: {
      index: './src/AppRoot.tsx',
    },
  },

  plugins: [
    pluginReact(),
    // Run Babel to apply compile-time transforms such as `babel-plugin-ts-nameof`.
    // Note: install `@babel/core` and `@babel/preset-typescript` as devDependencies.
    pluginBabel({
      // pass options for the internal babel-loader via `babelLoaderOptions`
      babelLoaderOptions: {
        presets: [[require.resolve('@babel/preset-typescript'), { isTSX: true, allExtensions: true }]],
        plugins: [require.resolve('babel-plugin-ts-nameof')],
      },
    }),
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