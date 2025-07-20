import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    fetchTokenInfo(token);
  }, [searchParams]);

  const fetchTokenInfo = async (token) => {
    try {
      const response = await axios.get(`http://localhost:1969/api/users/token-info/${token}`);
      
      if (response.data.success) {
        const data = response.data.data;
        setUserData(data);
        
        if (data.isVerified) {
          setStatus('already-verified');
          setMessage('This email is already verified. You can log in now.');
        } else if (data.isExpired) {
          setStatus('expired');
          setMessage('Verification link has expired. Please request a new one.');
        } else {
          setStatus('ready-to-verify');
          setMessage('Click the button below to verify your email address.');
        }
      } else {
        setStatus('error');
        setMessage('Invalid verification token');
      }
    } catch (error) {
      console.error('Token info error:', error);
      setStatus('error');
      setMessage('Failed to load verification information');
    }
  };

  const handleVerifyEmail = async () => {
    const token = searchParams.get('token');
    setStatus('verifying');
    
    try {
      const response = await axios.post('http://localhost:1969/api/users/verify-email', {
        token: token
      });
      
      if (response.data.success) {
        setStatus('success');
        setMessage('Email verified successfully! Redirecting to dashboard...');
        
        // Store the JWT token for auto-login
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          setTimeout(() => {
            navigate('/?verified=true');
          }, 2000);
        }
      } else {
        setStatus('error');
        setMessage(response.data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setMessage(error.response?.data?.message || 'Verification failed');
    }
  };

  const handleResendEmail = async () => {
    if (!userData?.email) return;
    
    try {
      const response = await axios.post('http://localhost:1969/api/users/resend-verification', {
        email: userData.email
      });

      if (response.data.success) {
        alert('New verification email sent! Please check your inbox.');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to resend verification email');
    }
  };

  const handleLoginRedirect = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 w-full max-w-md text-center">
        
        {/* User Info Display */}
        {userData && (
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Account Information</h3>
            <p className="text-purple-200"><strong>Username:</strong> {userData.username}</p>
            <p className="text-purple-200"><strong>Email:</strong> {userData.email}</p>
            <p className="text-purple-200">
              <strong>Status:</strong> 
              <span className={userData.isVerified ? 'text-green-400' : 'text-yellow-400'}>
                {userData.isVerified ? ' Verified' : ' Not Verified'}
              </span>
            </p>
          </div>
        )}

        {status === 'loading' && (
          <div className="text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold mb-2">Loading...</h2>
            <p>Please wait while we load your verification information.</p>
          </div>
        )}

        {status === 'ready-to-verify' && (
          <div className="text-white">
            <div className="text-blue-400 text-6xl mb-4">📧</div>
            <h2 className="text-2xl font-bold mb-4 text-blue-400">Ready to Verify</h2>
            <p className="mb-6">{message}</p>
            <button
              onClick={handleVerifyEmail}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 mb-4"
            >
              Verify Email Address
            </button>
          </div>
        )}

        {status === 'verifying' && (
          <div className="text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold mb-2">Verifying...</h2>
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

        {status === 'already-verified' && (
          <div className="text-white">
            <div className="text-green-400 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-4 text-green-400">Already Verified</h2>
            <p className="mb-6">{message}</p>
            <button
              onClick={handleLoginRedirect}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Go to Login
            </button>
          </div>
        )}

        {status === 'expired' && (
          <div className="text-white">
            <div className="text-yellow-400 text-6xl mb-4">⏰</div>
            <h2 className="text-2xl font-bold mb-4 text-yellow-400">Link Expired</h2>
            <p className="mb-6">{message}</p>
            <button
              onClick={handleResendEmail}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 mb-4"
            >
              Send New Verification Email
            </button>
            <br />
            <button
              onClick={handleLoginRedirect}
              className="text-purple-400 hover:text-purple-300 text-sm underline"
            >
              Back to Login
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





