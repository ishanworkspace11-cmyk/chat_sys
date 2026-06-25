import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleSuccess = async (credentialResponse) => {
    try {
      // Dynamic production URL
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      
      const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.role === 'prof') {
          navigate('/prof');
        } else {
          navigate('/student');
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to connect to the server. Is your backend running?");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm flex flex-col gap-6 bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CSE Connect</h1>
          <p className="text-sm text-gray-500 mt-2">
            The official communication portal for MNNIT Computer Science professors and students.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError("Google Login Failed. Please try again.")}
            useOneTap
          />
        </div>

        <p className="text-xs text-gray-400">
          Access restricted to authorized @mnnit.ac.in accounts only.
        </p>
      </div>
    </div>
  );
}

export default Login;