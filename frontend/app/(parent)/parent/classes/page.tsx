// app/(parent)/parent/classes/page.tsx - Class Schedule & Links

'use client';

import { useEffect, useState } from 'react';
import { parentAPI, ClassSession } from '@/lib/api';
import { Loader2, Calendar, ExternalLink, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ParentClassesPage() {
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentAPI.getClasses()
      .then(setClasses)
      .catch(() => toast.error('Failed to load classes'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const upcoming = classes.filter(c => new Date(c.date) >= now);
  const past = classes.filter(c => new Date(c.date) < now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Class Schedule</h1>
        <p className="text-gray-500">View upcoming and past classes with meeting links.</p>
      </div>

      {/* Upcoming Classes */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-500" />
          Upcoming Classes ({upcoming.length})
        </h2>
        <div className="space-y-3">
          {upcoming.map((cls) => (
            <div key={cls.id} className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-lg">{cls.topic || 'Chess Class'}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(cls.date).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(cls.date).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                      {' '}({cls.duration_minutes} min)
                    </span>
                  </div>
                  {cls.batch_name && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-primary-50 text-primary-700 rounded-md text-xs font-semibold">
                      {cls.batch_name}
                    </span>
                  )}
                  {cls.notes && (
                    <p className="text-sm text-gray-500 mt-2">{cls.notes}</p>
                  )}
                </div>
                {cls.meeting_link && (
                  <a
                    href={cls.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-primary-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-primary-600 transition flex-shrink-0 ml-4"
                  >
                    Join Class <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {upcoming.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center text-gray-500">
              No upcoming classes scheduled.
            </div>
          )}
        </div>
      </div>

      {/* Past Classes */}
      {past.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Past Classes ({past.length})</h2>
          <div className="space-y-2">
            {past.map((cls) => (
              <div key={cls.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4 opacity-75">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-700">{cls.topic || 'Chess Class'}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(cls.date).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                      {cls.batch_name && <span> &middot; {cls.batch_name}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded-full">Completed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
