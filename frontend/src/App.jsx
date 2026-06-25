import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {GoogleOAuthProvider} from '@react-oauth/google'
import Login from './Login'; 
import ProffessorPortal from './ProffessorPortal';
import StudentPortal from './StudentPortal';
import { io } from 'socket.io-client';

// Connect to your Node backend
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected to chat server!');
});


const App = () => {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
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