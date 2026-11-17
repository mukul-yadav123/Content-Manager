'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import NewsCard from '@/components/news/NewsCard';
import NewsFilters from '@/components/news/NewsFilters';
import DiscoverModal from '@/components/news/DiscoverModal';
import { newsApi, topicApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function DiscoverNewsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [articles, setArticles] = useState([]);
  const [topics, setTopics] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    discovered: 0,
    evaluated: 0,
    shortlisted: 0,
    rejected: 0,
    selected: 0,
    used: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Filter & Sort States
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedFreshness, setSelectedFreshness] = useState('all');
  const [selectedPublisher, setSelectedPublisher] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSort, setSelectedSort] = useState('score');
  const [minScore, setMinScore] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Modals & Action States
  const [isDiscoverModalOpen, setIsDiscoverModalOpen] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [batchEvaluating, setBatchEvaluating] = useState(false);

  // Fetch topics for filter dropdown
  const fetchTopics = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await topicApi.getAll({ limit: 100 });
      setTopics(res?.data?.items || []);
    } catch (err) {
      console.warn('Could not load topics for filter:', err.message);
    }
  }, [isAuthenticated]);

  // Fetch news feed with ranking filters
  const fetchNews = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const res = await newsApi.getAll({
        topicId: selectedTopic,
        freshness: selectedFreshness,
        publisher: selectedPublisher,
        status: selectedStatus,
        sortBy: selectedSort,
        minScore: minScore || undefined,
        search: searchTerm
      });

      setArticles(res?.data?.items || []);
      if (Array.isArray(res?.data?.publishers)) {
        setPublishers(res.data.publishers);
      }
      if (res?.data?.statusCounts) {
        setStatusCounts(res.data.statusCounts);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch news feed.');
    } finally {
      setLoading(false);
    }
  }, [
    isAuthenticated,
    selectedTopic,
    selectedFreshness,
    selectedPublisher,
    selectedStatus,
    selectedSort,
    minScore,
    searchTerm
  ]);

  const handleExecuteSearch = () => {
    setHasSearched(true);
    fetchNews();
  };

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // If user has already clicked search, re-fetch when dropdown filters change
  useEffect(() => {
    if (hasSearched) {
      fetchNews();
    }
  }, [selectedTopic, selectedFreshness, selectedPublisher, selectedStatus, selectedSort, minScore]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Trigger discovery for a topic
  const handleRunDiscovery = async ({ topicId, mode, customRssUrl }) => {
    setDiscoverLoading(true);
    try {
      const res = await newsApi.discover({ topicId, mode, customRssUrl });
      showToast(res.message || 'Discovery complete!');
      setHasSearched(true);
      fetchNews();
    } catch (err) {
      setError(err.message || 'News discovery failed.');
    } finally {
      setDiscoverLoading(false);
    }
  };

  // Evaluate a single story with AI & 4-criteria ranking
  const handleEvaluateStory = async (articleId) => {
    setActionLoading(true);
    try {
      const res = await newsApi.evaluate(articleId);
      if (res?.data) {
        setArticles((prev) =>
          prev.map((a) => (a._id === articleId ? res.data : a))
        );
        showToast(`Story evaluated! Score: ${res.data.relevanceScore}/100 (${res.data.status})`);
      }
      fetchNews();
    } catch (err) {
      setError(err.message || 'Story evaluation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Batch evaluate un-evaluated stories
  const handleBatchEvaluate = async () => {
    setBatchEvaluating(true);
    try {
      const res = await newsApi.evaluateBatch({
        topicId: selectedTopic !== 'all' ? selectedTopic : undefined,
        limit: 10
      });
      showToast(res.message || 'Batch evaluation completed!');
      fetchNews();
    } catch (err) {
      setError(err.message || 'Batch evaluation failed.');
    } finally {
      setBatchEvaluating(false);
    }
  };

  // Manually Approve Story for content generation
  const handleApproveStory = async (articleId) => {
    setActionLoading(true);
    try {
      const res = await newsApi.approve(articleId);
      setArticles((prev) =>
        prev.map((a) =>
          a._id === articleId ? { ...a, status: 'selected', isInteresting: true } : a
        )
      );
      showToast('Story approved & selected for LinkedIn Content Studio!');
      fetchNews();
    } catch (err) {
      setError(err.message || 'Failed to approve story.');
    } finally {
      setActionLoading(false);
    }
  };

  // Manually Reject Story (exclude from generation)
  const handleRejectStory = async (articleId, reason = '') => {
    setActionLoading(true);
    try {
      await newsApi.reject(articleId, reason);
      // Remove from active list if not filtering by rejected
      if (selectedStatus !== 'rejected') {
        setArticles((prev) => prev.filter((a) => a._id !== articleId));
      } else {
        setArticles((prev) =>
          prev.map((a) =>
            a._id === articleId ? { ...a, status: 'rejected', isInteresting: false, rejectionReason: reason } : a
          )
        );
      }
      showToast('Story rejected. Excluded from automated post generation.');
      fetchNews();
    } catch (err) {
      setError(err.message || 'Failed to reject story.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete story
  const handleDeleteStory = async (articleId) => {
    try {
      await newsApi.delete(articleId);
      setArticles((prev) => prev.filter((a) => a._id !== articleId));
      showToast('Story removed from database.');
    } catch (err) {
      setError(err.message || 'Failed to delete story.');
    }
  };

  // Clear all stories for topic/user
  const handleClearAllStories = async () => {
    if (!confirm('Are you sure you want to delete all news stories from your feed?')) return;
    try {
      await newsApi.deleteAll({ topicId: selectedTopic !== 'all' ? selectedTopic : undefined });
      setArticles([]);
      showToast('All news stories removed from database.');
    } catch (err) {
      setError(err.message || 'Failed to clear stories.');
    }
  };

  // Header Actions
  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Clear All Stories Button */}
      {articles.length > 0 && (
        <button
          onClick={handleClearAllStories}
          title="Delete all displayed stories from the database"
          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
        >
          Clear All Stories
        </button>
      )}

      {/* Batch Evaluate Button */}
      <button
        onClick={handleBatchEvaluate}
        disabled={batchEvaluating}
        title="Evaluate discovered stories with AI ranking"
        className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <span>{batchEvaluating ? '⏳' : '⚡'}</span>
        <span>{batchEvaluating ? 'Evaluating...' : 'Evaluate Stories'}</span>
      </button>

      <Link
        href="/topics"
        className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors hidden sm:inline-block"
      >
        Configure Topics
      </Link>

      <button
        onClick={() => setIsDiscoverModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Discover More</span>
      </button>
    </div>
  );

  if (authLoading) {
    return (
      <AppLayout title="Discover News">
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout title="Discover News" subtitle="AI web search & RSS intelligence">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center max-w-md mx-auto shadow-xs space-y-4 my-8">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-slate-900">Sign in to discover news</h2>
          <p className="text-xs text-slate-500">
            News discovery scans the live web for verified articles aligned with your monitored topics.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Discover News"
      subtitle="AI-powered live web intelligence, multi-criteria ranking, and editorial curation"
      actions={headerActions}
    >
      {/* Toast Alert */}
      {toast && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span>✓ {toast}</span>
          <button onClick={() => setToast('')} className="text-emerald-700 font-bold">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Multi-Filter & Scoring Filter Bar */}
      <NewsFilters
        topics={topics}
        publishers={publishers}
        statusCounts={statusCounts}
        selectedTopic={selectedTopic}
        onTopicChange={setSelectedTopic}
        selectedFreshness={selectedFreshness}
        onFreshnessChange={setSelectedFreshness}
        selectedPublisher={selectedPublisher}
        onPublisherChange={setSelectedPublisher}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedSort={selectedSort}
        onSortChange={setSelectedSort}
        minScore={minScore}
        onMinScoreChange={setMinScore}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearch={handleExecuteSearch}
      />

      {/* State before user clicks Search */}
      {!hasSearched ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Search Discovered News Stories</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Select your topic or keywords above, then click the Search button to view matching stories. News will only be loaded when you click Search.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={handleExecuteSearch}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search News</span>
            </button>
            <button
              onClick={() => setIsDiscoverModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Discover More Online
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-slate-100 rounded" />
                <div className="h-4 w-16 bg-slate-100 rounded" />
              </div>
              <div className="h-5 w-4/5 bg-slate-100 rounded" />
              <div className="h-14 w-full bg-slate-50 rounded" />
              <div className="flex justify-between pt-2">
                <div className="h-4 w-24 bg-slate-100 rounded" />
                <div className="h-6 w-20 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {selectedStatus === 'rejected'
              ? 'No Rejected Stories Found'
              : 'No Discovered News Stories Match Your Filters'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {topics.length === 0
              ? 'You have not configured any topics yet. Topics define the keywords and industries monitored by the search engine.'
              : selectedStatus === 'rejected'
              ? 'You have not rejected any stories. Approved or shortlisted stories appear in the active feed.'
              : 'Trigger a new web discovery scan or run AI evaluation on existing stories.'}
          </p>

          <div className="pt-2 flex justify-center gap-3">
            {topics.length === 0 ? (
              <Link
                href="/topics"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                + Set Up Your First Topic
              </Link>
            ) : (
              <button
                onClick={() => setIsDiscoverModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                + Run News Discovery Now
              </button>
            )}
          </div>
        </div>
      ) : (
        /* News Feed Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.map((article) => (
            <NewsCard
              key={article._id}
              article={article}
              onApprove={handleApproveStory}
              onReject={handleRejectStory}
              onEvaluate={handleEvaluateStory}
              onDelete={handleDeleteStory}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Discover More Modal */}
      <DiscoverModal
        isOpen={isDiscoverModalOpen}
        onClose={() => setIsDiscoverModalOpen(false)}
        onDiscover={handleRunDiscovery}
        topics={topics}
        loading={discoverLoading}
      />
    </AppLayout>
  );
}
