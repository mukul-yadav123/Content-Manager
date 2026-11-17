'use client';

import Link from 'next/link';

export default function RecentNews({ news = [], onToggleInteresting, loading }) {
  const getFreshnessLabel = (dateString) => {
    if (!dateString) return 'Recent';
    const diffHours = Math.max(0, (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60));
    if (diffHours < 6) return `Breaking (${Math.round(diffHours)}h ago)`;
    if (diffHours < 24) return `${Math.round(diffHours)}h ago`;
    if (diffHours < 48) return 'Past 48h';
    return `${Math.round(diffHours / 24)}d ago`;
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Ranked News Stories</h2>
          <p className="text-xs text-slate-500">Live scored intelligence from monitored topics</p>
        </div>
        <Link
          href="/discover"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          View All & Filter →
        </Link>
      </div>

      <div className="p-4 sm:p-5 flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : news.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-slate-700">No industry news discovered yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Add topics in Topics & Sources to enable the OpenAI research and ranking pipeline.
            </p>
            <div className="pt-2">
              <Link
                href="/topics"
                className="inline-block px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors"
              >
                Configure Topics
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {news.map((item) => (
              <div key={item._id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1"
                  >
                    {item.title}
                  </a>

                  <button
                    onClick={() => onToggleInteresting(item._id)}
                    title={item.isInteresting ? 'Marked interesting' : 'Mark as interesting'}
                    className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                      item.isInteresting
                        ? 'text-amber-500 hover:text-amber-600'
                        : 'text-slate-300 hover:text-slate-500'
                    }`}
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>

                {item.shortlistReason && (
                  <p className="text-[11px] text-blue-700 bg-blue-50/70 p-1.5 rounded border border-blue-100 line-clamp-1">
                    <span className="font-semibold">Why Shortlisted:</span> {item.shortlistReason}
                  </p>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 flex-wrap gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-600 truncate max-w-[120px]">
                      {item.publisher || item.sourceName || 'Web Intelligence'}
                    </span>
                    <span>&bull;</span>
                    <span className="text-slate-500 font-medium">
                      {getFreshnessLabel(item.publishedAt)}
                    </span>
                    {(item.sourceCount || 1) >= 2 && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-200">
                        {item.sourceCount} Sources
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        (item.relevanceScore || 80) >= 80
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      ⭐ {item.relevanceScore || 80}/100
                    </span>
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
