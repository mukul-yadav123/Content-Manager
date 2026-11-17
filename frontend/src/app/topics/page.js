'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import TopicList from '@/components/topics/TopicList';
import TopicModal from '@/components/topics/TopicModal';
import DeleteConfirmModal from '@/components/topics/DeleteConfirmModal';
import { topicApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const CATEGORY_TABS = [
  'all',
  'Artificial Intelligence',
  'Software Development',
  'Startups',
  'Business',
  'Technology',
  'Finance'
];

export default function TopicsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [deletingTopic, setDeletingTopic] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch topics from backend
  const fetchTopics = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const response = await topicApi.getAll({
        category: selectedCategory,
        search: searchTerm,
        priority: priorityFilter,
        isActive: statusFilter
      });
      setTopics(response?.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch topics from server.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedCategory, searchTerm, priorityFilter, statusFilter]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // Flash message helper
  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  // Create or Update
  const handleSaveTopic = async (topicData) => {
    if (editingTopic) {
      await topicApi.update(editingTopic._id, topicData);
      showToast(`Topic "${topicData.name}" updated successfully.`);
    } else {
      await topicApi.create(topicData);
      showToast(`Topic "${topicData.name}" created successfully.`);
    }
    fetchTopics();
  };

  // Toggle Active/Inactive
  const handleToggleStatus = async (topicId) => {
    try {
      await topicApi.toggle(topicId);
      // Optimistic update
      setTopics((prev) =>
        prev.map((t) => (t._id === topicId ? { ...t, isActive: !t.isActive } : t))
      );
    } catch (err) {
      setError(err.message || 'Failed to toggle topic status.');
      fetchTopics();
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!deletingTopic) return;
    setActionLoading(true);
    try {
      await topicApi.delete(deletingTopic._id);
      showToast(`Topic "${deletingTopic.name}" deleted.`);
      setDeletingTopic(null);
      fetchTopics();
    } catch (err) {
      setError(err.message || 'Failed to delete topic.');
    } finally {
      setActionLoading(false);
    }
  };

  // Header Actions
  const headerActions = (
    <button
      onClick={() => {
        setEditingTopic(null);
        setIsModalOpen(true);
      }}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <span>New Topic</span>
    </button>
  );

  if (authLoading) {
    return (
      <AppLayout title="Topics & Sources">
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLayout title="Topics & Sources" subtitle="Monitored industry intelligence">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center max-w-md mx-auto shadow-xs space-y-4 my-8">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-slate-900">Sign in to manage your topics</h2>
          <p className="text-xs text-slate-500">
            Topics and search queries are securely tied to your user account and MongoDB workspace.
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
      title="Topics & Sources"
      subtitle="Configure target industries, search query tags, and news freshness"
      actions={headerActions}
    >
      {/* Toast Alert */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-900">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-900">
            ×
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200/80 scrollbar-none">
        {CATEGORY_TABS.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {cat === 'all' ? 'All Topics' : cat}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search topics or keywords..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Paused Only</option>
          </select>
        </div>
      </div>

      {/* Topic Cards Grid */}
      <TopicList
        topics={topics}
        loading={loading}
        onEdit={(topic) => {
          setEditingTopic(topic);
          setIsModalOpen(true);
        }}
        onDelete={(topic) => setDeletingTopic(topic)}
        onToggleStatus={handleToggleStatus}
        onCreateClick={() => {
          setEditingTopic(null);
          setIsModalOpen(true);
        }}
      />

      {/* Create / Edit Modal */}
      <TopicModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTopic}
        topic={editingTopic}
        initialCategory={selectedCategory}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingTopic)}
        onClose={() => setDeletingTopic(null)}
        onConfirm={handleConfirmDelete}
        topicName={deletingTopic?.name || ''}
        loading={actionLoading}
      />
    </AppLayout>
  );
}

