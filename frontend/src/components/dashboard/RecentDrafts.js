'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RecentDrafts({ drafts = [], onStatusUpdate, loading }) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyHook = (id, hook) => {
    navigator.clipboard.writeText(hook);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ready':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'published':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'reviewing':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Recent Generated Content</h2>
          <p className="text-xs text-slate-500">Latest post drafts and manual status tracking</p>
        </div>
        <Link
          href="/studio"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          Open Studio →
        </Link>
      </div>

      <div className="p-4 sm:p-5 flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-slate-700">No content drafts generated yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Configure your topics first, then generate thought leadership posts tailored to your writing style.
            </p>
            <div className="pt-2">
              <Link
                href="/topics"
                className="inline-block px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors"
              >
                Set Up Topics
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {drafts.map((draft) => (
              <div key={draft._id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 line-clamp-1">
                        {draft.title}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${getStatusBadge(
                          draft.status
                        )}`}
                      >
                        {draft.status}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize hidden sm:inline">
                        • {draft.format}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 italic font-serif bg-slate-50 p-2 rounded border border-slate-100">
                      &ldquo;{draft.hook}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>
                    {draft.wordCount || 0} words &bull; {draft.characterCount || 0} chars
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyHook(draft._id, draft.hook)}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors text-[10px] font-medium cursor-pointer"
                    >
                      {copiedId === draft._id ? 'Copied!' : 'Copy Hook'}
                    </button>

                    {/* Quick Manual Status Action */}
                    {draft.status === 'draft' && (
                      <button
                        onClick={() => onStatusUpdate(draft._id, 'ready')}
                        className="px-2 py-1 text-emerald-700 hover:bg-emerald-100 bg-emerald-50 rounded transition-colors text-[10px] font-medium border border-emerald-200 cursor-pointer"
                      >
                        Mark Ready
                      </button>
                    )}
                    {draft.status === 'ready' && (
                      <button
                        onClick={() => onStatusUpdate(draft._id, 'published')}
                        className="px-2 py-1 text-blue-700 hover:bg-blue-100 bg-blue-50 rounded transition-colors text-[10px] font-medium border border-blue-200 cursor-pointer"
                      >
                        Mark Published
                      </button>
                    )}
                    {draft.status === 'published' && (
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        ✓ Published
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

