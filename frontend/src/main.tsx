import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './App';
import { setupStore } from './app/store';
import { parseEnv } from './config/env';
import { createHttpClient } from './shared/api/http-client';
import './index.css';

const { apiUrl } = parseEnv(import.meta.env);
const store = setupStore({ api: createHttpClient(apiUrl) });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
