'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

export default function ContentStudioPage() {
  return (
    <AppLayout
      title="Content Studio"
      subtitle="Craft, humanize, and preview viral LinkedIn thought leadership"
    >
      <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center max-w-lg mx-auto shadow-xs space-y-4 my-8">
        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-slate-900">Content Studio Workspace</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The content studio architecture is linked to your database drafts. In the next phase, you will be able to select researched stories, generate multiple hook variations, preview carousel slides, and export formatted copy.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            ← Back to Dashboard Overview
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

