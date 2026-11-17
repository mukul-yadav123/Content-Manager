'use client';

export default function StatCards({ metrics, loading }) {
  const cards = [
    {
      title: 'Discovered News',
      value: metrics?.totalNews ?? 0,
      subtext: `${metrics?.interestingStories ?? 0} marked interesting`,
      badge: 'Intel',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      )
    },
    {
      title: 'Interesting Stories',
      value: metrics?.interestingStories ?? 0,
      subtext: 'High-relevance leads',
      badge: 'Starred',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: (
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    },
    {
      title: 'Generated Drafts',
      value: metrics?.totalDrafts ?? 0,
      subtext: `${(metrics?.totalDrafts ?? 0) - (metrics?.readyPosts ?? 0) - (metrics?.publishedPosts ?? 0)} in review`,
      badge: 'Drafts',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: (
        <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      title: 'Ready to Publish',
      value: metrics?.readyPosts ?? 0,
      subtext: 'Reviewed and formatted',
      badge: 'Action',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Published Posts',
      value: metrics?.publishedPosts ?? 0,
      subtext: 'Manually logged live',
      badge: 'Live',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: (
        <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: 'Active Topics',
      value: metrics?.activeTopics ?? 0,
      subtext: `${metrics?.totalTopics ?? 0} total topics configured`,
      badge: 'Sources',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.title}
              </span>
              <span className="p-1 rounded-md bg-slate-50 border border-slate-100">
                {card.icon}
              </span>
            </div>

            {loading ? (
              <div className="h-8 w-16 bg-slate-100 rounded-md animate-pulse my-1"></div>
            ) : (
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {card.value}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">{card.subtext}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${card.badgeColor}`}
            >
              {card.badge}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

