'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import StatCards from '@/components/dashboard/StatCards';
import RecentDrafts from '@/components/dashboard/RecentDrafts';
import RecentNews from '@/components/dashboard/RecentNews';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import { dashboardApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function DashboardOverviewPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [overviewData, setOverviewData] = useState({
    metrics: {
      totalNews: 0,
      interestingStories: 0,
      totalDrafts: 0,
      readyPosts: 0,
      publishedPosts: 0,
      totalTopics: 0,
      activeTopics: 0
    },
    recentDrafts: [],
    recentNews: [],
    recentJobs: [],
    generationActivity: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const fetchOverview = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await dashboardApi.getOverview();
      if (response?.data) {
        setOverviewData(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard overview data.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Update content draft manual publishing status
  const handleStatusUpdate = async (draftId, newStatus) => {
    try {
      await dashboardApi.updateDraftStatus(draftId, newStatus);
      showToast(`Draft marked as "${newStatus}".`);
      fetchOverview();
    } catch (err) {
      setError(err.message || 'Failed to update post status.');
    }
  };

  // Toggle interesting news
  const handleToggleInteresting = async (articleId) => {
    try {
      await dashboardApi.toggleInteresting(articleId);
      // Optimistic update
      setOverviewData((prev) => ({
        ...prev,
        recentNews: prev.recentNews.map((n) =>
          n._id === articleId ? { ...n, isInteresting: !n.isInteresting } : n
        ),
        metrics: {
          ...prev.metrics,
          interestingStories: prev.metrics.interestingStories + 1
        }
      }));
      showToast('Article saved to interesting stories.');
      fetchOverview();
    } catch (err) {
      setError(err.message || 'Failed to toggle interesting status.');
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Link
        href="/topics"
        className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors hidden sm:inline-block"
      >
        Manage Topics
      </Link>
      <Link
        href="/studio"
        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
      >
        + Content Studio
      </Link>
    </div>
  );

  return (
    <AppLayout
      title="Studio Overview"
      subtitle="Real-time news research metrics and content pipeline status"
      actions={headerActions}
    >
      {/* Toast */}
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

      {/* Guest Welcome Banner if not authenticated */}
      {!isAuthenticated && !authLoading && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Personalized Studio
            </span>
            <h2 className="text-xl font-extrabold tracking-tight">
              AI-Powered LinkedIn Content Studio
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sign in or create an account to start discovering verified industry stories, configuring topics, and generating humanized LinkedIn posts.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}

      {/* 6 Metric Stat Cards (Real MongoDB Counts) */}
      <StatCards metrics={overviewData.metrics} loading={loading} />

      {/* Two Column Grid: Recent Drafts & Recent Discovered Stories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentDrafts
          drafts={overviewData.recentDrafts}
          onStatusUpdate={handleStatusUpdate}
          loading={loading}
        />
        <RecentNews
          news={overviewData.recentNews}
          onToggleInteresting={handleToggleInteresting}
          loading={loading}
        />
      </div>

      {/* Bottom Section: AI Generation Activity Feed */}
      <ActivityFeed
        jobs={overviewData.recentJobs}
        activityStats={overviewData.generationActivity}
        loading={loading}
      />
    </AppLayout>
  );
}
