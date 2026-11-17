'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { studioApi } from '@/services/api';

export default function ContentHistoryPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await studioApi.getDrafts(params);
      const items = res?.data?.items || res?.data || [];
      setDrafts(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message || 'Failed to load content history.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ready':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reviewing':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'archived':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <AppLayout
      title="Content History"
      subtitle="Archive of published posts, past drafts, and performance records"
    >
      <div className="space-y-6 max-w-6xl mx-auto my-4">
        {/* Filter & Search Bar */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {['all', 'published', 'ready', 'reviewing', 'draft', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search past posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="bg-white border border-slate-200/80 rounded-xl p-12 text-center text-xs text-slate-500 shadow-xs">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
            Loading historical posts...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-xs text-red-700 shadow-xs">
            {error}
            <button
              onClick={fetchHistory}
              className="block mx-auto mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : drafts.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center max-w-md mx-auto shadow-xs space-y-3 my-8">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              📝
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Posts in Archive</h3>
            <p className="text-xs text-slate-500">
              Posts generated in the Content Studio or published will appear here.
            </p>
            <div className="pt-2">
              <Link
                href="/studio"
                className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs"
              >
                Create New Post →
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drafts.map((draft) => (
              <div
                key={draft._id}
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                        draft.status
                      )}`}
                    >
                      {draft.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {draft.createdAt ? new Date(draft.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                    {draft.title || 'Untitled Post'}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {draft.hook || draft.body || 'No preview available.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>{draft.wordCount || 0} words</span>
                    <span>&bull;</span>
                    <span className="capitalize">{draft.format || 'Standard'}</span>
                    {draft.isHumanized && (
                      <span className="text-emerald-700 font-semibold">&bull; Humanized</span>
                    )}
                  </div>

                  <Link
                    href={`/studio?draftId=${draft._id}`}
                    className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Open in Studio &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
