'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, CheckCheck, Loader2, Trophy, Swords, X } from 'lucide-react';
import { notificationsAPI, type ApiNotification } from '@/lib/api';
import toast from 'react-hot-toast';

type NotificationTab = 'all' | 'unread' | 'coach' | 'achievement' | 'system';

const TABS: Array<{ key: NotificationTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'coach', label: 'Coach' },
  { key: 'achievement', label: 'Achievements' },
  { key: 'system', label: 'System' },
];

function getCategoryIcon(category: ApiNotification['category']) {
  switch (category) {
    case 'achievement':
      return <Trophy className="h-5 w-5 text-amber-500" />;
    case 'coach':
      return <Swords className="h-5 w-5 text-emerald-500" />;
    case 'system':
    default:
      return <BookOpen className="h-5 w-5 text-blue-500" />;
  }
}

function relativeTime(isoDate: string) {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await notificationsAPI.getList(200);
        if (!cancelled) setItems(data);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load notifications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return items;
    if (activeTab === 'unread') return items.filter((n) => !n.read);
    return items.filter((n) => n.category === activeTab);
  }, [activeTab, items]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const handleMarkAsRead = async (id: number) => {
    setBusyId(id);
    try {
      await notificationsAPI.markAsRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.error(e);
      toast.error('Could not mark notification as read');
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (id: number) => {
    setBusyId(id);
    try {
      await notificationsAPI.dismiss(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
      toast.error('Could not dismiss notification');
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (e) {
      console.error(e);
      toast.error('Could not mark all as read');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-4xl items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-8 w-8 text-primary" />
          <h1 className="font-heading text-2xl font-bold text-foreground">Notifications</h1>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
              {unreadCount} unread
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              All caught up
            </span>
          )}
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border-2 border-border bg-card p-8 text-center">
          <p className="font-heading text-base font-bold text-foreground">No notifications in this view</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another filter or check back later.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredItems.map((notification) => (
            <li
              key={notification.id}
              className={`rounded-xl border-2 p-4 transition ${
                notification.read
                  ? 'border-border bg-card'
                  : 'border-blue-200 bg-blue-50/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card">
                  {getCategoryIcon(notification.category)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-sm ${notification.read ? 'font-semibold text-foreground' : 'font-bold text-foreground'}`}>
                      {notification.title}
                    </p>
                    {!notification.read ? <span className="h-2 w-2 rounded-full bg-blue-500" /> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-2 text-xs font-medium text-muted-foreground/70">
                    {relativeTime(notification.created_at)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!notification.read ? (
                      <button
                        type="button"
                        onClick={() => void handleMarkAsRead(notification.id)}
                        disabled={busyId === notification.id}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
                      >
                        Mark as read
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDismiss(notification.id)}
                      disabled={busyId === notification.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
