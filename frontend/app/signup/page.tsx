// app/signup/page.tsx - Split layout: graphic left, form right

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { X, Plus, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Fredoka, Nunito } from 'next/font/google';

type SignupMode = 'student' | 'parent';

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
      const redirectPath =
        response.user.role === 'coach' || response.user.role === 'admin'
          ? '/coach'
          : response.user.role === 'parent'
            ? '/parent'
            : '/dashboard';
      router.push(redirectPath);
    } catch (error: unknown) {
      console.error('Signup error:', error);
      const msg =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      const fallback = 'Signup failed. Please try again.';
      setInlineError(msg || fallback);
      toast.error(msg || fallback);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${fredoka.variable} ${nunito.variable} dashboard-fonts h-dvh overflow-hidden flex relative`}
    >
      {isLoading && (
        <div className="absolute inset-0 backdrop-blur-sm z-50 flex items-center justify-center bg-background/60">
          <div className="text-center space-y-3">
            <Loader2 className="w-9 h-9 text-emerald-600 animate-spin mx-auto" />
            <p className="font-heading text-lg font-bold text-foreground">Creating your account...</p>
          </div>
        </div>
      )}

      {/* Left — chess graphic */}
      <div className="hidden md:flex md:w-[42%] lg:w-1/2 h-full min-h-0 relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 shrink-0">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(255,255,255,0.15) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.15) 75%),
              linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.15) 75%)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
          }}
        />
        <div className="relative z-10 flex flex-col h-full min-h-0 p-6 lg:p-8">
          <div className="flex gap-2 text-2xl lg:text-3xl opacity-90 shrink-0">
            <span>♜</span>
            <span>♞</span>
            <span>♝</span>
            <span>♛</span>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center py-4">
            <div className="relative w-full max-w-[280px] lg:max-w-xs aspect-square max-h-[min(42vh,320px)]">
              <Image
                src="/images/learn-chess.jpg"
                alt="Kids learning chess"
                fill
                className="object-cover rounded-2xl shadow-2xl"
                priority
                sizes="(max-width: 1024px) 42vw, 50vw"
              />
              <div className="absolute -bottom-2 -right-2 text-5xl lg:text-6xl drop-shadow-lg">♟️</div>
              <div className="absolute -top-1 -left-1 text-4xl lg:text-5xl drop-shadow-lg">♕</div>
            </div>
          </div>

          <div className="text-white shrink-0">
            <p className="font-heading text-xl lg:text-2xl font-bold leading-snug">
              Your chess adventure starts here.
            </p>
            <p className="mt-1.5 text-emerald-100 text-sm lg:text-base">
              Join puzzles, lessons, and games made for young players.
            </p>
          </div>
        </div>
      </div>

      {/* Right — signup form */}
      <div className="flex-1 h-full min-h-0 min-w-0 flex flex-col bg-background overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 sm:px-8">
          <div className="w-full max-w-sm mx-auto">
            <div className="mb-4 sm:mb-5">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Sign up</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {mode === 'student'
                  ? 'Create your student account.'
                  : 'Create your parent account.'}
              </p>
            </div>

            <div className="flex rounded-lg bg-muted/50 p-1 mb-4 border border-border">
              <button
                type="button"
                onClick={() => {
                  setMode('student');
                  setInlineError('');
                }}
                className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-heading font-bold transition ${
                  mode === 'student'
                    ? 'bg-card text-emerald-700 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                I&apos;m a Student
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('parent');
                  setInlineError('');
                }}
                className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-heading font-bold transition ${
                  mode === 'parent'
                    ? 'bg-card text-emerald-700 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                I&apos;m a Parent
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {inlineError && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                >
                  {inlineError}
                </div>
              )}

              <div>
                <label htmlFor="full_name" className="block text-sm font-heading font-semibold text-foreground mb-1">
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
                  disabled={isLoading}
                  className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 text-sm"
                  placeholder="Your Name"
                  required
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-heading font-semibold text-foreground mb-1">
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
                  disabled={isLoading}
                  className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 text-sm"
                  placeholder={mode === 'parent' ? 'parent_jane' : 'chess_master'}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-heading font-semibold text-foreground mb-1">
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
                  disabled={isLoading}
                  className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 text-sm"
                  placeholder="your@email.com"
                  required={mode === 'parent'}
                />
                {mode === 'student' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Students log in with username. Email is optional.
                  </p>
                )}
              </div>

              {mode === 'student' && (
                <div>
                  <label htmlFor="guardian_email" className="block text-sm font-heading font-semibold text-foreground mb-1">
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
                    disabled={isLoading}
                    className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 text-sm"
                    placeholder="parent@email.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Links your account when your parent signs up with the same email.
                  </p>
                </div>
              )}

              {mode === 'student' && (
                <div>
                  <label htmlFor="age" className="block text-sm font-heading font-semibold text-foreground mb-1">
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
                    disabled={isLoading}
                    className="w-full px-3 py-2.5 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 text-sm"
                    placeholder="10"
                  />
                </div>
              )}

              {mode === 'student' && (
                <div>
                  <label className="block text-sm font-heading font-semibold text-foreground mb-1">
                    I am a
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: 'girl' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition ${
                        formData.gender === 'girl'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-border text-muted-foreground hover:border-emerald-300'
                      }`}
                    >
                      Girl
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: 'boy' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border-2 transition ${
                        formData.gender === 'boy'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-border text-muted-foreground hover:border-emerald-300'
                      }`}
                    >
                      Boy
                    </button>
                  </div>
                </div>
              )}

              {mode === 'student' && (
                <div>
                  <label className="block text-sm font-heading font-semibold text-foreground mb-1">
                    Choose your avatar
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar_url: opt.value })}
                        className={`relative w-11 h-11 rounded-lg border-2 overflow-hidden transition shrink-0 ${
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
                          <User className="w-5 h-5" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'parent' && (
                <div>
                  <label className="block text-sm font-heading font-semibold text-foreground mb-1">
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
                        disabled={isLoading}
                        className="flex-1 px-3 py-2.5 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 text-sm"
                        placeholder="child@email.com (optional)"
                      />
                      {childEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChildEmail(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddChildEmail}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add another child
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-heading font-semibold text-foreground mb-1">
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
                    disabled={isLoading}
                    className="w-full px-3 py-2.5 pr-10 border-2 border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition disabled:opacity-50 text-sm"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                    className="absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-500 text-white font-heading font-bold py-2.5 px-5 rounded-lg hover:from-emerald-700 hover:to-green-600 shadow-md transition disabled:opacity-50 text-sm"
              >
                {isLoading
                  ? 'Creating account...'
                  : mode === 'parent'
                    ? 'Sign Up as Parent'
                    : 'Sign Up'}
              </button>
            </form>

            <p className="text-center text-muted-foreground text-sm mt-4 mb-4">
              Already have an account?{' '}
              <Link href="/login" className="font-heading font-semibold text-emerald-600 hover:text-emerald-700">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
