import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/');
    }

    // Check for verification errors from URL
    const error = searchParams.get('error');
    if (error) {
      let errorMessage = 'Verification failed';
      if (error === 'expired') {
        errorMessage = 'Verification link has expired. Please request a new verification email.';
      } else if (error === 'invalid') {
        errorMessage = 'Invalid verification link. Please try again.';
      } else if (error === 'server') {
        errorMessage = 'Server error during verification. Please try again.';
      }

      alert(errorMessage);
      // Clean up URL parameters
      navigate('/auth', { replace: true });
    }
  }, [navigate, searchParams]);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please provide a valid email';
    return '';
  };

  const validateUsername = (username) => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters long';
    if (username.length > 30) return 'Username cannot exceed 30 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) return 'Username can only contain letters, numbers, underscores, and hyphens';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters long';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    return '';
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isLogin) {
      newErrors.username = validateUsername(formData.username);
    }
    newErrors.email = validateEmail(formData.email);
    newErrors.password = validatePassword(formData.password);

    // Remove empty error messages
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key];
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const url = isLogin ? 'http://localhost:1969/api/users/login' : 'http://localhost:1969/api/users/register';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(url, payload);
      const data = response.data;

      if (data.success) {
        if (isLogin) {
          // Login successful - store token and redirect
          localStorage.setItem('token', data.token);
          navigate('/welcome');
        } else {
          // Registration successful - show verification message
          alert('Registration successful! Please check your email to verify your account before logging in.');
          setIsLogin(true); // Switch to login form
          setFormData({ username: '', email: '', password: '' });
        }
      } else {
        alert(data.message || 'An error occurred');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Server error';

      // Handle email verification required
      if (error.response?.data?.needsVerification) {
        alert(`${errorMessage}\n\nPlease check your email and click the verification link before logging in.`);
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({ username: '', email: '', password: '' });
    setErrors({});
  };

  const ErrorMessage = ({ error }) => {
    if (!error) return null;
    return (
      <div className="flex items-center space-x-2 text-red-400 text-sm mt-1">
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
      </div>
    );
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      alert('Please enter your email address first');
      return;
    }

    try {
      const response = await axios.post('http://localhost:1969/api/users/resend-verification', {
        email: formData.email
      });

      if (response.data.success) {
        alert('Verification email sent! Please check your inbox.');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to resend verification email');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Left Side - Welcome Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-12 flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative z-10 text-white">
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Welcome to
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
                Notulate
              </span>
            </h1>
          </div>

          <div className="space-y-6 text-lg opacity-90">
            <p className="leading-relaxed">
              Write notes. Calculate instantly. Stay organized with smart, real-time math built into your notepad.
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                <span>Live calculation while typing</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-pink-300 rounded-full"></div>
                <span>Variables, formulas, and references</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                <span>Light/Dark themes & export options</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Authentication Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white border-opacity-20 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-gray-300">
                {isLogin ? 'Sign in to your account to continue' : 'Join us and start your journey today'}
              </p>
            </div>

            <div className="space-y-6">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Username"
                    className={`w-full pl-12 pr-4 py-3 bg-white bg-opacity-10 border ${errors.username ? 'border-red-500' : 'border-white border-opacity-20'
                      } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200`}
                    required
                  />
                  <ErrorMessage error={errors.username} />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email address"
                  className={`w-full pl-12 pr-4 py-3 bg-white bg-opacity-10 border ${errors.email ? 'border-red-500' : 'border-white border-opacity-20'
                    } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200`}
                  required
                />
                <ErrorMessage error={errors.email} />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                  className={`w-full pl-12 pr-12 py-3 bg-white bg-opacity-10 border ${errors.password ? 'border-red-500' : 'border-white border-opacity-20'
                    } rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-300 backdrop-blur-sm transition-all duration-200`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <ErrorMessage error={errors.password} />
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-purple-300 hover:text-purple-200 text-sm transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 focus:ring-4 focus:ring-purple-300 focus:ring-opacity-50 transition-all duration-200 transform hover:scale-105 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {isSubmitting ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </div>

            {isLogin && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="text-purple-400 hover:text-purple-300 text-sm underline"
                >
                  Resend verification email
                </button>
              </div>
            )}

            <div className="mt-8 text-center">
              <p className="text-gray-300 mb-4">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </p>
              <button
                onClick={toggleAuthMode}
                className="text-purple-300 hover:text-purple-200 font-semibold transition-colors"
              >
                {isLogin ? 'Sign up here' : 'Sign in here'}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-white border-opacity-10">
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
                <span>Secure</span>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <span>Encrypted</span>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <span>Protected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
