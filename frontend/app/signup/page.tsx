// app/signup/page.tsx - Signup Page (Student + Parent modes)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Sparkles, X, Plus } from 'lucide-react';

type SignupMode = 'student' | 'parent';

export default function SignupPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [mode, setMode] = useState<SignupMode>('student');
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    age: '',
  });
  const [childEmails, setChildEmails] = useState(['']);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddChildEmail = () => {
    setChildEmails([...childEmails, '']);
  };

  const handleRemoveChildEmail = (index: number) => {
    if (childEmails.length === 1) return;
    setChildEmails(childEmails.filter((_, i) => i !== index));
  };

  const handleChildEmailChange = (index: number, value: string) => {
    const updated = [...childEmails];
    updated[index] = value;
    setChildEmails(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.username || !formData.full_name || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (mode === 'parent') {
      const validEmails = childEmails.filter(e => e.trim());
      if (validEmails.length === 0) {
        toast.error('Please enter at least one child\'s email');
        return;
      }
    }

    setIsLoading(true);

    try {
      let response;
      if (mode === 'parent') {
        response = await authAPI.signupParent({
          email: formData.email,
          username: formData.username,
          full_name: formData.full_name,
          password: formData.password,
          child_emails: childEmails.filter(e => e.trim()),
        });
      } else {
        response = await authAPI.signup({
          ...formData,
          age: formData.age ? parseInt(formData.age) : undefined,
        });
      }

      login(response.user);
      toast.success(`Welcome to Prodigy Pawns, ${response.user.full_name}!`);
      const redirectPath = response.user.role === 'coach' || response.user.role === 'admin'
        ? '/coach'
        : response.user.role === 'parent'
        ? '/parent'
        : '/dashboard';
      router.push(redirectPath);
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-100 via-purple-50 to-blue-100 flex items-center justify-center p-4">
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
            {mode === 'student' ? 'Start your chess journey today!' : 'Track your child\'s chess progress!'} ♟️
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-primary-200">
          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('student')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition ${
                mode === 'student'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              I&apos;m a Student
            </button>
            <button
              type="button"
              onClick={() => setMode('parent')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition ${
                mode === 'parent'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              I&apos;m a Parent
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            {mode === 'student' ? 'Create Student Account' : 'Create Parent Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-gray-800"
                placeholder="Your Name"
                required
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
                Username *
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-gray-800"
                placeholder={mode === 'parent' ? 'parent_jane' : 'chess_master'}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-gray-800"
                placeholder="your@email.com"
                required
              />
            </div>

            {/* Age (Student only) */}
            {mode === 'student' && (
              <div>
                <label htmlFor="age" className="block text-sm font-semibold text-gray-700 mb-2">
                  Age (Optional)
                </label>
                <input
                  id="age"
                  type="number"
                  min="5"
                  max="99"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-gray-800"
                  placeholder="10"
                />
              </div>
            )}

            {/* Child Emails (Parent only) */}
            {mode === 'parent' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Child&apos;s Account Email(s) *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Enter the email address(es) used for your child&apos;s student account
                </p>
                {childEmails.map((email, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleChildEmailChange(index, e.target.value)}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-gray-800"
                      placeholder="child@email.com"
                      required
                    />
                    {childEmails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChildEmail(index)}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddChildEmail}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium mt-1"
                >
                  <Plus className="w-4 h-4" />
                  Add another child
                </button>
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password * (min 6 characters)
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition text-gray-800"
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
                  Creating account...
                </span>
              ) : (
                mode === 'parent' ? 'Sign Up as Parent' : 'Sign Up'
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-gray-600 mt-6">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-primary-600 font-semibold hover:text-primary-700 transition"
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
