import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import Login from './Login';
import ProffessorPortal from './ProffessorPortal';
import StudentPortal from './StudentPortal';

function getStoredUser() {
  try {
    const userStr = localStorage.getItem('cse_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    localStorage.removeItem('cse_user');
    return null;
  }
}

function ProtectedRoute({ children, allowedRole }) {
  const userData = getStoredUser();

  if (!userData) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && userData.role !== allowedRole) {
    const redirectPath = userData.role === 'prof' ? '/prof' : '/student';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/prof"
            element={
              <ProtectedRoute allowedRole="prof">
                <ProffessorPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentPortal />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
