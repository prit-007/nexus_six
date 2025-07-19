import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await axios.get(`http://localhost:1969/api/users/verify-email/${token}`);
      
      if (response.data.success) {
        setStatus('success');
        setMessage('Email verified successfully! You can now log in.');
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Verification failed');
    }
  };

  const handleLoginRedirect = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md text-center">
        {status === 'verifying' && (
          <div className="text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold mb-2">Verifying Email...</h2>
            <p>Please wait while we verify your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-white">
            <div className="text-green-400 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-4 text-green-400">Email Verified!</h2>
            <p className="mb-6">{message}</p>
            <button
              onClick={handleLoginRedirect}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Go to Login
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-white">
            <div className="text-red-400 text-6xl mb-4">✗</div>
            <h2 className="text-2xl font-bold mb-4 text-red-400">Verification Failed</h2>
            <p className="mb-6">{message}</p>
            <button
              onClick={handleLoginRedirect}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}