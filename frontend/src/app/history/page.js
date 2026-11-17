'use client';

import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

export default function ContentHistoryPage() {
  return (
    <AppLayout
      title="Content History"
      subtitle="Archive of published posts, past drafts, and performance records"
    >
      <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center max-w-lg mx-auto shadow-xs space-y-4 my-8">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-slate-900">Historical Content Archive</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          All published and archived posts will be indexed here with revision histories and engagement tags.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            ← Back to Overview
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

