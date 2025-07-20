import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center text-white relative">  
        <h1 className="text-4xl font-bold mb-4">Welcome to CalcNote!</h1>
        <p className="text-xl mb-8">You have successfully logged in.</p>
        <button
          onClick={handleGetStarted}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
