import React, { useContext } from 'react';
import './App.css';
import { TenantContext } from './contexts/TenantContext';
import DashboardLogic from './components/workspaces/DashboardLogic/DashboardLogic';

console.log('App.tsx: File loaded');

function App() {
  console.log('App: Component function called');

  const { data: tenantData, loading, error } = useContext(TenantContext);

  console.log('App - tenantData:', tenantData);
  console.log('App - loading:', loading);
  console.log('App - error:', error);

  if (loading) {
    console.log('App - Showing loading because loading=true');
    return (
      <div className="App">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
          }}
        >
          <h1>CrownLabs Loading...</h1>
          <p>Setting things back up... Hold tight!</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('App - Showing error message');
    return <div>Error loading tenant: {error.message}</div>;
  }

  if (!tenantData?.tenant) {
    console.log('App - Showing development mode message');
    return (
      <div className="App">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <div style={{ padding: '20px' }}>
            <h1>CrownLabs - Development Mode</h1>
            <p>
              No tenant data available (this is expected in development mode)
            </p>
            <p>The app is working correctly!</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('App - Should show dashboard now');

  return (
    <div className="App">
      <div style={{ padding: '20px', border: '1px solid red' }}>
        <h1>App Component Working!</h1>
        <p>React is successfully rendering</p>
      </div>
      <DashboardLogic />
    </div>
  );
}

console.log('App.tsx: About to export App');

export default App;
