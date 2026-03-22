// app/(coach)/coach/settings/page.tsx - Coach account settings

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store';
import { userAPI } from '@/lib/api';
import {
  getAvatarDisplayUrl,
  isDefaultOrEmptyAvatar,
  PRESET_AVATAR_PATHS,
  usernameInitial,
} from '@/lib/avatar';
import { Settings, User, LogOut, Loader2, Save, Upload, ImageIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';

const cardClass = 'rounded-xl border border-border bg-card p-6 shadow-sm';

export default function CoachSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, user, logout, updateUser } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [age, setAge] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'coach' && user?.role !== 'admin')) {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? '');
      setAvatarUrl(user.avatar_url ?? '');
      setAge(user.age != null ? String(user.age) : '');
      setAvatarImgError(false);
    }
  }, [user]);

  const displaySrc = getAvatarDisplayUrl(avatarUrl);
  const showPlaceholder =
    !displaySrc || avatarImgError || isDefaultOrEmptyAvatar(avatarUrl);
  const initial = usernameInitial(user?.username);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be 2MB or smaller');
      return;
    }

    setUploadingAvatar(true);
    try {
      const updated = await userAPI.uploadAvatar(file);
      updateUser(updated);
      setAvatarUrl(updated.avatar_url ?? '');
      setAvatarImgError(false);
      setAvatarDialogOpen(false);
      toast.success('Profile photo updated');
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(typeof detail === 'string' ? detail : 'Upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const selectPreset = (path: string) => {
    setAvatarUrl(path);
    setAvatarImgError(false);
    setAvatarDialogOpen(false);
  };

  const handleSaveProfile = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error('Full name is required');
      return;
    }

    let ageNum: number | undefined;
    if (age.trim() !== '') {
      const n = parseInt(age, 10);
      if (Number.isNaN(n) || n < 1 || n > 120) {
        toast.error('Age must be between 1 and 120, or leave blank');
        return;
      }
      ageNum = n;
    }

    setSaving(true);
    try {
      const updated = await userAPI.updateProfile({
        full_name: trimmedName,
        avatar_url: avatarUrl.trim() || undefined,
        age: ageNum,
      });
      updateUser(updated);
      setAvatarUrl(updated.avatar_url ?? '');
      toast.success('Profile updated');
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(typeof detail === 'string' ? detail : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
      router.push('/login');
    } catch {
      setSigningOut(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-[min(50vh,400px)] items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[min(70vh,480px)]">
      <div className="mb-6">
        <h1 className="font-heading flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 sm:h-11 sm:w-11">
            <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Account details for the coach console. Email and username are managed by your administrator.
        </p>
      </div>

      <div className="space-y-6">
        <section className={cardClass}>
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-card-foreground">
            <User className="h-5 w-5 text-primary" />
            Account
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-muted-foreground">Email</dt>
              <dd className="mt-0.5 text-foreground">{user.email}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted-foreground">Username</dt>
              <dd className="mt-0.5 text-foreground">{user.username}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted-foreground">Role</dt>
              <dd className="mt-0.5 capitalize text-foreground">{user.role}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted-foreground">Member since</dt>
              <dd className="mt-0.5 text-foreground">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </dd>
            </div>
          </dl>
        </section>

        <section className={cardClass}>
          <h2 className="mb-4 font-heading text-lg font-bold text-card-foreground">Profile</h2>

          <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center sm:items-start">
              <div
                className={`relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted shadow-sm ring-2 ring-primary/10 ${
                  showPlaceholder ? '' : ''
                }`}
              >
                {showPlaceholder ? (
                  <span className="font-heading text-4xl font-bold text-muted-foreground">{initial}</span>
                ) : displaySrc.startsWith('/') ? (
                  <Image
                    src={displaySrc}
                    alt=""
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarImgError(true)}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- external API upload URLs
                  <img
                    src={displaySrc}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setAvatarImgError(true)}
                  />
                )}
              </div>
              <p className="mt-2 max-w-[12rem] text-center text-xs text-muted-foreground sm:text-left">
                {showPlaceholder ? 'Choose an avatar or upload your own photo.' : 'Your profile picture'}
              </p>
              <button
                type="button"
                onClick={() => setAvatarDialogOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <ImageIcon className="h-4 w-4" />
                Choose your avatar
              </button>
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-6">
            <div>
              <label htmlFor="coach-full-name" className="mb-1.5 block text-sm font-semibold text-foreground">
                Full name *
              </label>
              <input
                id="coach-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="coach-age" className="mb-1.5 block text-sm font-semibold text-foreground">
                Age <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="coach-age"
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="max-w-[120px] rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSaveProfile()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save profile
            </button>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="mb-2 font-heading text-lg font-bold text-card-foreground">Session</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Sign out of the coach console on this device.
          </p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={signingOut}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sign out
          </button>
        </section>
      </div>

      {avatarDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAvatarDialogOpen(false);
          }}
        >
          <div
            className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3
                id="avatar-dialog-title"
                className="font-heading text-lg font-bold text-card-foreground"
              >
                Choose your avatar
              </h3>
              <button
                type="button"
                onClick={() => setAvatarDialogOpen(false)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(min(90vh,640px)-8rem)] overflow-y-auto px-5 py-4">
              <p className="mb-3 text-sm text-muted-foreground">
                Pick a preset below, or upload your own. Uploads save right away; presets need{' '}
                <span className="font-medium text-foreground">Save profile</span> on the settings page.
              </p>

              <div className="mb-5 grid grid-cols-4 gap-2 sm:grid-cols-4">
                {PRESET_AVATAR_PATHS.map((path) => {
                  const selected = avatarUrl === path;
                  return (
                    <button
                      key={path}
                      type="button"
                      onClick={() => selectPreset(path)}
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-border hover:border-primary/40'
                      }`}
                      title="Use this avatar"
                    >
                      <Image src={path} alt="" fill sizes="96px" className="object-cover" />
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-border pt-4">
                <p className="mb-2 text-sm font-semibold text-foreground">Upload a photo</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  aria-label="Upload profile photo"
                  onChange={(e) => void handleFileChange(e)}
                />
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploadingAvatar ? 'Uploading…' : 'Choose file'}
                </button>
                <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG, WebP, or GIF · max 2MB</p>
              </div>
            </div>

            <div className="border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={() => setAvatarDialogOpen(false)}
                className="w-full rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
