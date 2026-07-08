'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { parentAPI } from '@/lib/api';

interface AddChildPanelProps {
  onCreated?: () => void;
  onClose?: () => void;
  defaultOpen?: boolean;
  showClose?: boolean;
}

export function AddChildPanel({
  onCreated,
  onClose,
  defaultOpen = true,
  showClose = true,
}: AddChildPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [creating, setCreating] = useState(false);
  const [childForm, setChildForm] = useState({
    full_name: '',
    username: '',
    password: '',
  });

  if (!open) return null;

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childForm.full_name.trim() || !childForm.username.trim() || !childForm.password) {
      toast.error('Please fill in name, username, and password.');
      return;
    }
    setCreating(true);
    try {
      await parentAPI.createChild({
        full_name: childForm.full_name.trim(),
        username: childForm.username.trim(),
        password: childForm.password,
      });
      toast.success(`${childForm.full_name} can log in with their username!`);
      setChildForm({ full_name: '', username: '', password: '' });
      setOpen(false);
      onCreated?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      toast.error(msg || 'Failed to create child account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Create child account</h2>
        {showClose && (
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Your child will log in with their <strong>username</strong> and password — not your email.
        The account is linked to you immediately.
      </p>
      <form onSubmit={handleCreateChild} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Full name *</label>
          <input
            type="text"
            value={childForm.full_name}
            onChange={(e) => setChildForm({ ...childForm, full_name: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Username *</label>
          <input
            type="text"
            value={childForm.username}
            onChange={(e) => setChildForm({ ...childForm, username: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
            placeholder="emma_sharma"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Password *</label>
          <input
            type="text"
            value={childForm.password}
            onChange={(e) => setChildForm({ ...childForm, password: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5"
            minLength={4}
            required
          />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create account'}
          </button>
          {showClose && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
