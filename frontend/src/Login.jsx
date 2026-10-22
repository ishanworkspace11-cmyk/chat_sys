import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-redirect if already authenticated
  useEffect(() => {
    const userStr = localStorage.getItem('cse_user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData?.role === 'prof') {
          navigate('/prof', { replace: true });
        } else if (userData?.role === 'student') {
          navigate('/student', { replace: true });
        }
      } catch {
        localStorage.removeItem('cse_user');
      }
    }
  }, [navigate]);

  const handleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

      const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Server returned an unexpected response. Please check backend logs.');
      }

      if (response.ok && data.success) {
        // Persist session in localStorage
        const sessionUser = {
          ...(data.user || {}),
          role: data.role || 'student',
        };
        localStorage.setItem('cse_user', JSON.stringify(sessionUser));

        if (data.role === 'prof') {
          navigate('/prof');
        } else {
          navigate('/student');
        }
      } else {
        setError(data.message || 'Login failed. Please verify your credentials.');
      }
    } catch (err) {
      setError(
        err.message?.includes('Failed to fetch')
          ? 'Unable to reach backend server. Please verify your backend is running.'
          : err.message || 'Authentication failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md flex flex-col gap-6 bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
        <div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-[#3390EC] font-bold text-xl mb-3">
            CSE
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CSE Connect</h1>
          <p className="text-sm text-gray-500 mt-2">
            The official role-based communication portal for MNNIT Computer Science professors and students.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3.5 rounded-xl border border-red-200 text-left">
            <div className="font-semibold mb-1">Authentication Error:</div>
            <div>{error}</div>
          </div>
        )}

        {!clientId && (
          <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-lg border border-amber-200 text-left">
            <strong>Notice:</strong> <code>VITE_GOOGLE_CLIENT_ID</code> is not defined in the environment.
          </div>
        )}

        <div className="flex flex-col items-center justify-center w-full gap-3">
          {loading ? (
            <div className="text-sm text-gray-500 py-3 flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
              Authenticating official account...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() =>
                setError(
                  'Google Sign-In failed or was blocked. If seeing Error 400 (origin_mismatch), add this website URL to Authorized JavaScript Origins in Google Cloud Console.'
                )
              }
              useOneTap={false}
            />
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400">
            Access strictly restricted to authorized <span className="font-medium text-gray-600">@mnnit.ac.in</span> accounts only.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
