'use client';

export default function TopicList({
  topics = [],
  loading = false,
  onEdit,
  onDelete,
  onToggleStatus,
  onCreateClick
}) {
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getRegionLabel = (region) => {
    switch (region) {
      case 'north_america':
        return 'North America';
      case 'europe':
        return 'Europe';
      case 'asia_pacific':
        return 'Asia-Pacific';
      case 'latin_america':
        return 'Latin America';
      case 'middle_east_africa':
        return 'ME & Africa';
      default:
        return 'Global';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs animate-pulse space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-12 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-3/4 bg-slate-100 rounded" />
            <div className="h-10 w-full bg-slate-50 rounded" />
            <div className="flex gap-1.5 pt-2">
              <div className="h-5 w-14 bg-slate-100 rounded-full" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">No Topics Found</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Topics tell the AI what industries and trends to research with OpenAI web search. Add your first topic to kick off automated news discovery.
        </p>
        <button
          onClick={onCreateClick}
          className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          + Create Your First Topic
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {topics.map((topic) => (
        <div
          key={topic._id}
          className={`bg-white border rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
            topic.isActive ? 'border-slate-200/90' : 'border-slate-200/50 opacity-75'
          }`}
        >
          {/* Card Top */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                {topic.category}
              </span>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getPriorityBadge(
                    topic.priority
                  )}`}
                >
                  {topic.priority}
                </span>

                {/* Active Toggle Switch */}
                <button
                  type="button"
                  onClick={() => onToggleStatus(topic._id)}
                  title={topic.isActive ? 'Disable topic' : 'Enable topic'}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    topic.isActive ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      topic.isActive ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <h4 className="text-base font-bold text-slate-900 tracking-tight leading-snug line-clamp-1">
                {topic.name}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                {topic.description || 'No description provided. Monitoring industry publications and announcements.'}
              </p>
            </div>

            {/* Keyword Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {topic.keywords?.length > 0 ? (
                topic.keywords.slice(0, 4).map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200/70 text-[10px] font-medium"
                  >
                    #{kw}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-400 italic">No query tags</span>
              )}
              {topic.keywords?.length > 4 && (
                <span className="text-[10px] text-slate-400 font-semibold self-center">
                  +{topic.keywords.length - 4} more
                </span>
              )}
            </div>
          </div>

          {/* Card Bottom Meta & Actions */}
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>{getRegionLabel(topic.region)}</span>
              <span>&bull;</span>
              <span>{topic.freshness || '48h'}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(topic)}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                title="Edit Topic"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <button
                onClick={() => onDelete(topic)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                title="Delete Topic"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

