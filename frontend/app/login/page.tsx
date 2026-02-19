// app/login/page.tsx - Login Page

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Sparkles, Loader2, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.login(email, password);
      login(response.user);
      // Delay toast until after navigation starts
      setTimeout(() => {
        toast.success(`Welcome back, ${response.user.full_name}! 🎉`);
      }, 100);
      // Redirect based on role: coach/admin → /coach, student → /dashboard
      const redirectPath = response.user.role === 'coach' || response.user.role === 'admin' 
        ? '/coach' 
        : '/dashboard';
      router.push(redirectPath);
    } catch (error: any) {
      console.error('Login error:', error);
      setIsLoading(false); // Only stop loading on error
      toast.error(error.response?.data?.detail || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 via-purple-50 to-blue-100 flex items-center justify-center p-4 relative">
      {/* Full-page loader overlay - Kid-friendly! */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-purple-50 to-blue-50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-6">
            {/* Animated chess piece and sparkles */}
            <div className="relative">
              <div className="text-8xl animate-bounce" style={{ animationDuration: '1s' }}>
                ♟️
              </div>
              {/* Floating sparkles around the pawn */}
              <Sparkles className="absolute -top-4 -left-4 w-8 h-8 text-yellow-400 animate-pulse" style={{ animationDelay: '0s' }} />
              <Sparkles className="absolute -top-2 -right-6 w-6 h-6 text-purple-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
              <Sparkles className="absolute -bottom-2 -left-6 w-7 h-7 text-blue-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
              <Sparkles className="absolute -bottom-4 -right-4 w-8 h-8 text-pink-400 animate-pulse" style={{ animationDelay: '0.9s' }} />
            </div>
            
            {/* Spinning loader */}
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              <Zap className="w-6 h-6 text-yellow-500 animate-pulse" />
            </div>
            
            {/* Fun text */}
            <div className="space-y-2">
              <p className="text-2xl font-bold bg-gradient-to-r from-primary-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Logging you in...
              </p>
              <p className="text-lg text-gray-600 font-semibold animate-pulse">
                Get ready to play! 🎮
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-10 h-10 text-primary-600" />
            <h1 className="text-4xl font-bold text-primary-800">
              Prodigy Pawns
            </h1>
            <Sparkles className="w-10 h-10 text-primary-600" />
          </div>
          <p className="text-gray-600 text-lg">
            Welcome back, young chess master! ♟️
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-primary-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Log In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="your@email.com"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-primary-600 hover:to-purple-700 transform hover:scale-105 transition duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging in...
                </span>
              ) : (
                'Log In 🚀'
              )}
            </button>
          </form>

          {/* Quick Login (Development Only) */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
            <p className="text-xs font-semibold text-blue-800 mb-2">Quick Test Login:</p>
            <button
              onClick={() => {
                setEmail('alice@prodigypawns.com');
                setPassword('password123');
              }}
              disabled={isLoading}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use Alice's Account →
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="text-primary-600 font-semibold hover:text-primary-700 transition"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
