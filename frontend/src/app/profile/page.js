'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';

export default function WritingProfilePage() {
  const { user } = useAuth();

  return (
    <AppLayout
      title="Writing Profile"
      subtitle="Personal voice matching, forbidden buzzwords, and stylistic guidelines"
    >
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 max-w-2xl mx-auto shadow-xs space-y-6 my-4">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-full bg-slate-900 text-white font-bold text-lg flex items-center justify-center">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{user?.name || 'Creator Voice'}</h2>
            <p className="text-xs text-slate-500">{user?.headline || 'Configured via MongoDB WritingProfile'}</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
              Active Voice Tone
            </span>
            <p className="text-sm font-semibold text-slate-800">
              Authoritative yet accessible, conversational, punchy
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="font-bold uppercase text-[10px] tracking-wider text-slate-500">
              Default Banned AI Cliches (Auto-Stripped)
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'game-changer',
                'delve',
                'tapestry',
                'thrilled to announce',
                'in today fast-paced world',
                'leverage',
                'synergy',
                'beacon'
              ].map((w, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-semibold"
                >
                  ✕ {w}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

