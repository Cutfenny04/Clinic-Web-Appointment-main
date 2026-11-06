import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { route } from './utils/route';

// Expose route helper globally so any component calling route('...') works without manual import
if (typeof window !== 'undefined') {
  window.route = route;

  // Realtime echo abstraction fallback with complete stub methods
  const dummyChannel = {
    listen: () => dummyChannel,
    stopListening: () => dummyChannel,
    notification: () => dummyChannel,
    listenForWhisper: () => dummyChannel,
    whisper: () => dummyChannel,
  };

  window.Echo = {
    channel: () => dummyChannel,
    private: () => dummyChannel,
    encryptedPrivate: () => dummyChannel,
    presence: () => dummyChannel,
    leave: () => {},
    leaveChannel: () => {},
    disconnect: () => {},
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
