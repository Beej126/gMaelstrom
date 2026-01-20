import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastContainer, Bounce } from 'react-toastify';
import { ThemeProvider } from './services/ctxTheme';
import { SettingsProvider } from './services/ctxSettings';
import { ApiDataCacheProviderComponent } from './services/ctxApiDataCache';
import 'react-toastify/dist/ReactToastify.css';

const rootEl = document.getElementById('root');
if (rootEl) ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>

    <ToastContainer
      style={{ width: "unset" }}
      toastStyle={{ width: "unset" }}
      position="top-center"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick={true}
      pauseOnFocusLoss={true}
      draggable={true}
      pauseOnHover={true}
      theme="colored"
      transition={Bounce}
    />

    <SettingsProvider>
      <ThemeProvider>
        <ApiDataCacheProviderComponent>
          <App />
        </ApiDataCacheProviderComponent>
      </ThemeProvider>
    </SettingsProvider>

  </React.StrictMode>,
);
