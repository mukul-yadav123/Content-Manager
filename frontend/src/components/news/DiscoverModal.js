'use client';

import { useState } from 'react';

export default function DiscoverModal({ isOpen, onClose, onDiscover, topics = [], loading }) {
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [mode, setMode] = useState('all');
  const [customRssUrl, setCustomRssUrl] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTopicId) {
      setError('Please select a topic to run discovery for.');
      return;
    }

    setError('');
    try {
      await onDiscover({
        topicId: selectedTopicId,
        mode,
        customRssUrl: customRssUrl.trim() || undefined
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Discovery failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Run News Discovery</h2>
            <p className="text-xs text-slate-500">Scan live web intelligence and curated RSS feeds</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Select Topic */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Topic <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">-- Choose a topic to research --</option>
              {topics.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          {/* Discovery Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Discovery Engine Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('all')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                  mode === 'all'
                    ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                AI + RSS
              </button>
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                  mode === 'ai'
                    ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                OpenAI Web
              </button>
              <button
                type="button"
                onClick={() => setMode('rss')}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                  mode === 'rss'
                    ? 'bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                RSS Only
              </button>
            </div>
          </div>

          {/* Optional Custom RSS Feed */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Custom RSS Feed URL (Optional)
            </label>
            <input
              type="url"
              value={customRssUrl}
              onChange={(e) => setCustomRssUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Searching Web...
                </>
              ) : (
                'Run Discovery'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

