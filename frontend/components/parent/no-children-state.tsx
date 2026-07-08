'use client';

import { Users, Plus } from 'lucide-react';

interface NoChildrenStateProps {
  onAddChild: () => void;
}

export function NoChildrenState({ onAddChild }: NoChildrenStateProps) {
  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white p-10 text-center">
      <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
      <p className="text-lg text-gray-600">No children linked yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
        Create an account for your child below, or wait for a child who signs up with your
        guardian email to appear here automatically.
      </p>
      <button
        type="button"
        onClick={onAddChild}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        <Plus className="h-4 w-4" />
        Add a child
      </button>
    </div>
  );
}
