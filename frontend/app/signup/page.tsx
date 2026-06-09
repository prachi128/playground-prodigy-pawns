// app/signup/page.tsx - Signup Page (Student + Parent modes)

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Sparkles, X, Plus, User, Eye, EyeOff } from 'lucide-react';
import { Fredoka, Nunito } from 'next/font/google';

type SignupMode = 'student' | 'parent';

// Avatar options for signup (paths under public/ - add images to public/avatars/)
const AVATAR_OPTIONS = [
  { value: '/avatars/kid-1.png', label: 'Avatar 1' },
  { value: '/avatars/kid-2.png', label: 'Avatar 2' },
  { value: '/avatars/kid-3.png', label: 'Avatar 3' },
  { value: '/avatars/kid-4.png', label: 'Avatar 4' },
  { value: '/avatars/kid-5.png', label: 'Avatar 5' },
  { value: '/avatars/kid-6.png', label: 'Avatar 6' },
  { value: '/avatars/kid-7.png', label: 'Avatar 7' },
  { value: '/avatars/kid-8.png', label: 'Avatar 8' },
  { value: '/avatars/kid-9.png', label: 'Avatar 9' },
  { value: '/avatars/kid-10.png', label: 'Avatar 10' },
  { value: '/avatars/kid-11.png', label: 'Avatar 11' },
  { value: '/avatars/kid-12.png', label: 'Avatar 12' },
] as const;

const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka' });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' });

export default function SignupPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const [mode, setMode] = useState<SignupMode>('student');
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    guardian_email: '',
    age: '',
    gender: '' as '' | 'girl' | 'boy',
    avatar_url: '/avatars/kid-1.png',
  });
  const [childEmails, setChildEmails] = useState(['']);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');

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
    setInlineError('');

    if (!formData.username || !formData.full_name || !formData.password) {
      const msg = 'Please fill in all required fields.';
      setInlineError(msg);
      toast.error(msg);
      return;
    }

    if (mode === 'parent' && !formData.email) {
      const msg = 'Please enter your email address.';
      setInlineError(msg);
      toast.error(msg);
      return;
    }

    if (formData.password.length < 6) {
      const msg = 'Password must be at least 6 characters.';
      setInlineError(msg);
      toast.error(msg);
      return;
    }
    setIsLoading(true);

    try {
      let response;
      if (mode === 'parent') {
        const legacyChildEmails = childEmails.filter((e) => e.trim());
        response = await authAPI.signupParent({
          email: formData.email,
          username: formData.username,
          full_name: formData.full_name,
          password: formData.password,
          child_emails: legacyChildEmails.length > 0 ? legacyChildEmails : undefined,
        });
      } else {
        response = await authAPI.signup({
          email: formData.email.trim() || undefined,
          username: formData.username,
          full_name: formData.full_name,
          password: formData.password,
          guardian_email: formData.guardian_email.trim() || undefined,
          age: formData.age ? parseInt(formData.age) : undefined,
          gender: formData.gender || undefined,
          avatar_url: formData.avatar_url || undefined,
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
      const msg = error.response?.data?.detail || 'Signup failed. Please try again.';
      setInlineError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${fredoka.variable} ${nunito.variable} dashboard-fonts min-h-screen flex items-center justify-center p-4 relative`}
      style={{
        backgroundColor: '#9dc4b8',
        backgroundImage: `
          radial-gradient(circle at 1px 1px, rgba(16, 185, 129, 0.2) 1.5px, transparent 0),
          radial-gradient(circle at 1px 1px, rgba(30, 64, 175, 0.08) 1px, transparent 0),
          linear-gradient(to bottom right, rgba(167, 243, 208, 0.85), rgba(196, 181, 253, 0.75), rgba(191, 219, 254, 0.85))
        `,
        backgroundSize: '32px 32px, 24px 24px, 100% 100%',
        backgroundPosition: '0 0, 12px 12px, 0 0',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-10 h-10 text-amber-400" />
            <h1 className="font-heading text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
              Prodigy Pawns
            </h1>
            <Sparkles className="w-10 h-10 text-amber-400" />
          </div>
          <p className="text-muted-foreground text-lg">
            {mode === 'student' ? 'Start your chess journey today!' : 'Track your child\'s chess progress!'} ♟️
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-card rounded-2xl shadow-xl p-8 border-2 border-border">
          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-white/20 p-1 mb-6 border-2 border-border">
            <button
              type="button"
              onClick={() => setMode('student')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-heading font-bold transition ${
                mode === 'student'
                  ? 'bg-card text-emerald-700 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              I&apos;m a Student
            </button>
            <button
              type="button"
              onClick={() => setMode('parent')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-heading font-bold transition ${
                mode === 'parent'
                  ? 'bg-card text-emerald-700 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              I&apos;m a Parent
            </button>
          </div>

          <h2 className="font-heading text-2xl font-bold text-card-foreground mb-6 text-center">
            {mode === 'student' ? 'Create Student Account' : 'Create Parent Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {inlineError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                {inlineError}
              </div>
            )}
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-heading font-semibold text-foreground mb-2">
                Full Name *
              </label>
              <input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => {
                  setFormData({ ...formData, full_name: e.target.value });
                  if (inlineError) setInlineError('');
                }}
                className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Your Name"
                required
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-heading font-semibold text-foreground mb-2">
                Username *
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value });
                  if (inlineError) setInlineError('');
                }}
                className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={mode === 'parent' ? 'parent_jane' : 'chess_master'}
                required
              />
            </div>

            {/* Email (parent required; student optional) */}
            <div>
              <label htmlFor="email" className="block text-sm font-heading font-semibold text-foreground mb-2">
                {mode === 'parent' ? 'Your Email *' : 'Your Email (Optional)'}
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (inlineError) setInlineError('');
                }}
                className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="your@email.com"
                required={mode === 'parent'}
              />
              {mode === 'student' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Students log in with username. Email is optional.
                </p>
              )}
            </div>

            {/* Guardian email (student only) */}
            {mode === 'student' && (
              <div>
                <label htmlFor="guardian_email" className="block text-sm font-heading font-semibold text-foreground mb-2">
                  Parent / Guardian Email
                </label>
                <input
                  id="guardian_email"
                  type="email"
                  value={formData.guardian_email}
                  onChange={(e) => {
                    setFormData({ ...formData, guardian_email: e.target.value });
                    if (inlineError) setInlineError('');
                  }}
                  className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="parent@email.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Links your account when your parent signs up with the same email.
                </p>
              </div>
            )}

            {/* Age (Student only) */}
            {mode === 'student' && (
              <div>
                <label htmlFor="age" className="block text-sm font-heading font-semibold text-foreground mb-2">
                  Age (Optional)
                </label>
                <input
                  id="age"
                  type="number"
                  min="5"
                  max="99"
                  value={formData.age}
                  onChange={(e) => {
                    setFormData({ ...formData, age: e.target.value });
                    if (inlineError) setInlineError('');
                  }}
                  className="w-full px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="10"
                />
              </div>
            )}

            {/* Gender (Student only) - I am a girl / boy */}
            {mode === 'student' && (
              <div>
                <label className="block text-sm font-heading font-semibold text-foreground mb-2">
                  I am a
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'girl' })}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium border-2 transition ${
                      formData.gender === 'girl'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-border text-muted-foreground hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    Girl
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'boy' })}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium border-2 transition ${
                      formData.gender === 'boy'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-border text-muted-foreground hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    Boy
                  </button>
                </div>
              </div>
            )}

            {/* Choose Avatar (Student only) */}
            {mode === 'student' && (
              <div>
                <label className="block text-sm font-heading font-semibold text-foreground mb-2">
                  Choose your avatar
                </label>
                <div className="flex flex-wrap gap-3">
                  {AVATAR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar_url: opt.value })}
                      className={`relative w-14 h-14 rounded-xl border-2 overflow-hidden transition shrink-0 ${
                        formData.avatar_url === opt.value
                          ? 'border-emerald-500 ring-2 ring-emerald-200'
                          : 'border-border hover:border-emerald-300'
                      }`}
                      title={opt.label}
                    >
                      <img
                        src={opt.value}
                        alt={opt.label}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling;
                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }}
                      />
                      <span
                        className="absolute inset-0 hidden items-center justify-center bg-muted text-muted-foreground/40"
                        style={{ display: 'none' }}
                        aria-hidden
                      >
                        <User className="w-6 h-6" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Child Emails (Parent only — optional legacy link) */}
            {mode === 'parent' && (
              <div>
                <label className="block text-sm font-heading font-semibold text-foreground mb-2">
                  Child&apos;s Account Email(s) (Optional)
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  We automatically link children whose guardian email matches yours. Only add emails here if your child has an older account with its own email.
                </p>
                {childEmails.map((email, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        handleChildEmailChange(index, e.target.value);
                        if (inlineError) setInlineError('');
                      }}
                      className="flex-1 px-4 py-3 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="child@email.com (optional)"
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
                  className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1"
                >
                  <Plus className="w-4 h-4" />
                  Add another child
                </button>
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-heading font-semibold text-foreground mb-2">
                Password * (min 6 characters)
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (inlineError) setInlineError('');
                  }}
                  className="w-full px-4 py-3 pr-12 border-2 border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white font-heading font-bold py-3 px-6 rounded-xl hover:from-emerald-700 hover:to-green-600 shadow-md hover:shadow-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
          <p className="text-center text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-heading font-semibold text-emerald-600 hover:text-emerald-700 transition"
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
