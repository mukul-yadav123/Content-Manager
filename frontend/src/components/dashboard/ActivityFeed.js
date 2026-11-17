'use client';

export default function ActivityFeed({ jobs = [], activityStats = [], loading }) {
  const getJobBadge = (type) => {
    switch (type) {
      case 'news-research':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'post-generation':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'image-generation':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'humanize':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800 animate-pulse';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900">AI Generation Activity</h2>
        <p className="text-xs text-slate-500">Asynchronous BullMQ worker queue pipeline history</p>
      </div>

      <div className="p-4 sm:p-5 flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-6 text-center space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-slate-700">No generation activity yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              When you trigger background news discovery or DALL-E image generation, live job progress will stream here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${getJobBadge(
                      job.jobType
                    )}`}
                  >
                    {job.jobType.replace('-', ' ')}
                  </span>
                  <span className="text-slate-700 font-medium capitalize">
                    {job.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  {job.durationMs && (
                    <span>{(job.durationMs / 1000).toFixed(1)}s</span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                      job.status
                    )}`}
                  >
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

