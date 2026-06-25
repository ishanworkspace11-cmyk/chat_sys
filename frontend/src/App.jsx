import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { io } from 'socket.io-client';

import Login from './Login';
import ProffessorPortal from './ProffessorPortal';
import StudentPortal from './StudentPortal';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:5000';

export const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Socket Connected');
});

function App() {
  return (
    <GoogleOAuthProvider
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/prof" element={<ProffessorPortal />} />
          <Route path="/student" element={<StudentPortal />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;