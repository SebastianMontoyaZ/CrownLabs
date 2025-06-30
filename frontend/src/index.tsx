import React from 'react';
import ReactDOM from 'react-dom';
import './theming';
import App from './App';
import AuthContextProvider from './contexts/AuthContext';
import ApolloClientSetup from './graphql-components/apolloClientSetup/ApolloClientSetup';
import { TenantProvider } from './contexts/TenantContext';
import ErrorContextProvider from './errorHandling/ErrorContext';

// Add error handlers at the very top
window.addEventListener('error', function (e) {
  console.error(
    '=== GLOBAL ERROR ===',
    e.error,
    e.message,
    e.filename,
    e.lineno
  );
});

window.addEventListener('unhandledrejection', function (e) {
  console.error('=== UNHANDLED PROMISE REJECTION ===', e.reason);
});

console.log('=== ERROR HANDLERS INSTALLED ===');

console.log('=== INDEX.TSX: Starting ===');

try {
  console.log('=== INDEX.TSX: About to import App ===');
  // Import App and other components inside try block
  const App = require('./App').default;

  console.log('=== INDEX.TSX: App imported successfully ===');
  console.log('=== INDEX.TSX: About to render ===');

  ReactDOM.render(
    <React.StrictMode>
      <ErrorContextProvider>
        <AuthContextProvider>
          <ApolloClientSetup>
            <TenantProvider>
              <App />
            </TenantProvider>
          </ApolloClientSetup>
        </AuthContextProvider>
      </ErrorContextProvider>
    </React.StrictMode>,
    document.getElementById('root')
  );

  console.log('=== INDEX.TSX: Render completed ===');
} catch (error) {
  console.error('=== INDEX.TSX: ERROR CAUGHT ===', error);

  // Fallback render
  ReactDOM.render(
    <div style={{ padding: '20px' }}>
      <h1>Error in App</h1>
      <pre>{error.toString()}</pre>
    </div>,
    document.getElementById('root')
  );
}
