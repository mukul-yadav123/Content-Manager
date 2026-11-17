'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <AppLayout
      title="Settings"
      subtitle="Workspace preferences, OpenAI configurations, and account security"
    >
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 max-w-2xl mx-auto shadow-xs space-y-6 my-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Account & Workspace Configuration
        </h2>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <div>
              <p className="font-bold text-slate-900">User Identity</p>
              <p className="text-slate-500">{user?.name || 'Guest User'} &bull; {user?.email}</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold uppercase">
              {user?.role || 'user'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <div>
              <p className="font-bold text-slate-900">AI Text Engine</p>
              <p className="text-slate-500">Default model: gpt-4o-mini (Zod environment validated)</p>
            </div>
            <span className="text-emerald-700 font-semibold text-[11px]">Active</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-100">
            <div>
              <p className="font-bold text-slate-900">Image & Carousel Storage</p>
              <p className="text-slate-500">Cloudinary CDN module configured</p>
            </div>
            <span className="text-blue-700 font-semibold text-[11px]">Ready</span>
          </div>
        </div>

        <div className="pt-2 text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Back to Overview
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

