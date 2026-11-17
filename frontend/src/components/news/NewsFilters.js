'use client';

export default function NewsFilters({
  topics = [],
  publishers = [],
  statusCounts = {},
  selectedTopic,
  onTopicChange,
  selectedFreshness,
  onFreshnessChange,
  selectedPublisher,
  onPublisherChange,
  selectedStatus,
  onStatusChange,
  selectedSort,
  onSortChange,
  minScore,
  onMinScoreChange,
  searchTerm,
  onSearchChange,
  onSearch
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3.5">
      {/* Top Search Bar & Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (onSearch) onSearch();
          }}
          className="flex items-center gap-2 flex-1"
        >
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search news headlines, summaries, key facts, or LinkedIn angles..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
          </button>
        </form>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
            Sort:
          </label>
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="score">⭐ Relevance Score (Highest)</option>
            <option value="publishedAt">🕒 Published (Newest First)</option>
            <option value="discoveredAt">📥 Discovered (Recent First)</option>
          </select>
        </div>
      </div>

      {/* Filter Selects Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100">
        {/* Topic Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Topic
          </label>
          <select
            value={selectedTopic}
            onChange={(e) => onTopicChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Topics</option>
            {topics.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date / Freshness Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Publication Freshness
          </label>
          <select
            value={selectedFreshness}
            onChange={(e) => onFreshnessChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">Anytime</option>
            <option value="24h">Past 24 hours (Breaking)</option>
            <option value="48h">Past 48 hours (Fresh)</option>
            <option value="7d">Past 7 days</option>
            <option value="30d">Past 30 days</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Active Stories</option>
            <option value="shortlisted">
              🎯 Shortlisted ({statusCounts?.shortlisted || 0})
            </option>
            <option value="selected">
              ✓ Selected / Approved ({statusCounts?.selected || 0})
            </option>
            <option value="evaluated">
              ⚡ Evaluated ({statusCounts?.evaluated || 0})
            </option>
            <option value="discovered">
              📥 Newly Discovered ({statusCounts?.discovered || 0})
            </option>
            <option value="rejected">
              ✕ Rejected ({statusCounts?.rejected || 0})
            </option>
            <option value="used">
              📝 Used in Posts ({statusCounts?.used || 0})
            </option>
          </select>
        </div>

        {/* Score Threshold Filter */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Score Threshold
          </label>
          <select
            value={minScore}
            onChange={(e) => onMinScoreChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Any Score</option>
            <option value="85">⭐ 85+ (Top Tier Picks)</option>
            <option value="70">🎯 70+ (Shortlist Quality)</option>
            <option value="50">⚡ 50+ (Moderate)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
