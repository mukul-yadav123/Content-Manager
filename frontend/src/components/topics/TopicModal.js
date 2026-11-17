'use client';

import { useState, useEffect } from 'react';

const CATEGORIES = [
  'Artificial Intelligence',
  'Software Development',
  'Startups',
  'Business',
  'Technology',
  'Finance',
  'Other'
];

const REGIONS = [
  { value: 'global', label: 'Global' },
  { value: 'north_america', label: 'North America (US & Canada)' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia_pacific', label: 'Asia-Pacific' },
  { value: 'latin_america', label: 'Latin America' },
  { value: 'middle_east_africa', label: 'Middle East & Africa' }
];

const FRESHNESS = [
  { value: '24h', label: 'Past 24 hours (Breaking Trends)' },
  { value: '48h', label: 'Past 48 hours (Trending Stories)' },
  { value: '7d', label: 'Past 7 days (Weekly Roundup)' },
  { value: '30d', label: 'Past 30 days (Deep Dive Reports)' }
];

const PRIORITIES = [
  { value: 'high', label: 'High Priority (Daily Pipeline)' },
  { value: 'medium', label: 'Medium Priority (Weekly Focus)' },
  { value: 'low', label: 'Low Priority (Backlog / Periodic)' }
];

export default function TopicModal({ isOpen, onClose, onSave, topic = null, initialCategory = '' }) {
  const isEditing = Boolean(topic?._id);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Technology',
    description: '',
    keywords: [],
    region: 'global',
    freshness: '48h',
    priority: 'medium',
    isActive: true
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (topic) {
      setFormData({
        name: topic.name || '',
        category: topic.category || 'Technology',
        description: topic.description || '',
        keywords: Array.isArray(topic.keywords) ? [...topic.keywords] : [],
        region: topic.region || 'global',
        freshness: topic.freshness || '48h',
        priority: topic.priority || 'medium',
        isActive: typeof topic.isActive === 'boolean' ? topic.isActive : true
      });
    } else {
      setFormData({
        name: '',
        category: initialCategory && initialCategory !== 'all' ? initialCategory : 'Technology',
        description: '',
        keywords: [],
        region: 'global',
        freshness: '48h',
        priority: 'medium',
        isActive: true
      });
    }
    setKeywordInput('');
    setError('');
  }, [topic, initialCategory, isOpen]);

  if (!isOpen) return null;

  const handleAddKeyword = (e) => {
    e?.preventDefault();
    const trimmed = keywordInput.trim();
    if (!trimmed) return;

    if (formData.keywords.some((k) => k.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Keyword "${trimmed}" already added.`);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      keywords: [...prev.keywords, trimmed]
    }));
    setKeywordInput('');
    setError('');
  };

  const handleRemoveKeyword = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Topic name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save topic.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEditing ? 'Edit Monitored Topic' : 'Add New Industry Topic'}
            </h2>
            <p className="text-xs text-slate-500">
              Configure topics, search keywords, regions, and research freshness
            </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Topic Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Topic Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Generative AI & Autonomous Agents"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Generation Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Region & Freshness Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Preferred News Region
              </label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                News Freshness Window
              </label>
              <select
                value={formData.freshness}
                onChange={(e) => setFormData({ ...formData, freshness: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
              >
                {FRESHNESS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multiple Keywords Tag Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Search Keywords & Query Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type keyword and press Enter (e.g. LLM, OpenAI, RAG)"
                className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Add Tag
              </button>
            </div>

            {/* Keyword Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5 min-h-[32px]">
              {formData.keywords.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic">
                  No keywords added yet. Keywords guide news discovery precision.
                </span>
              ) : (
                formData.keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    <span>{keyword}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(idx)}
                      className="text-blue-400 hover:text-blue-700 font-bold ml-0.5 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Topic Description & Context
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Provide context on what kind of stories or thought leadership angles to focus on..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div>
              <p className="text-xs font-bold text-slate-800">Enable Automated Discovery</p>
              <p className="text-[11px] text-slate-500">
                When enabled, the studio actively scrapes news and generates drafts for this topic
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Topic' : 'Create Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

