import React from 'react';
import ReactDOMServer from 'react-dom/server';
import AppRoutes from './src/routes/AppRoutes.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './src/context/AuthContext.jsx';
import { route } from './src/utils/route.js';

global.window = {
  location: { pathname: '/admin/dashboard', origin: 'http://localhost:5173' },
  localStorage: { getItem: () => null, setItem: () => null },
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  Echo: {
    channel: () => ({ listen: () => ({}), stopListening: () => ({}) }),
    leaveChannel: () => {},
  },
};
global.window.route = route;

try {
  console.log('Rendering Admin Dashboard test...');
  // Import Admin Dashboard directly
  const { default: AdminDashboard } = await import('./src/pages/admin/Dashboard.jsx');
  const { default: withPageProps } = await import('./src/utils/withPageProps.jsx');
  const Wrapped = withPageProps(AdminDashboard);

  const html = ReactDOMServer.renderToString(
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(Wrapped, null)
      )
    )
  );
  console.log('Render Success! HTML length:', html.length);
} catch (err) {
  console.error('DIAGNOSIS ERROR CAUGHT:');
  console.error(err);
}
