'use client';

import { useState, useEffect, useCallback, Suspense, use } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { newsApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

function NewsDetailContent({ paramsPromise }) {
  const resolvedParams = use(paramsPromise);
  const articleId = resolvedParams?.id;

  const { isAuthenticated, loading: authLoading } = useAuth();

  const [article, setArticle] = useState(null);
  const [research, setResearch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Fetch story details
  const fetchArticleDetails = useCallback(async () => {
    if (!isAuthenticated || !articleId) return;
    setLoading(true);
    setError('');
    try {
      const res = await newsApi.getById(articleId);
      if (res?.data) {
        setArticle(res.data);
        if (res.data.deepResearch) {
          setResearch(res.data.deepResearch);
          setUserNotes(res.data.deepResearch.userNotes || '');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load news story details.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, articleId]);

  useEffect(() => {
    fetchArticleDetails();
  }, [fetchArticleDetails]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Run or re-run deep investigative research
  const handleTriggerDeepResearch = async () => {
    setResearching(true);
    setError('');
    try {
      const res = await newsApi.research(articleId);
      if (res?.data?.research) {
        setResearch(res.data.research);
        setUserNotes(res.data.research.userNotes || '');
      }
      if (res?.data?.article) {
        setArticle(res.data.article);
      }
      showToast('Deep investigative research & multi-source fact-checking completed!');
    } catch (err) {
      setError(err.message || 'Deep research failed.');
    } finally {
      setResearching(false);
    }
  };

  // Save creator notes and reviewed claims
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await newsApi.updateResearch(articleId, { userNotes });
      showToast('Research notes and creator perspectives saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  // Approve / Select Story
  const handleApproveStory = async () => {
    try {
      const res = await newsApi.approve(articleId);
      setArticle(res.data);
      showToast('Story approved and selected for LinkedIn Content Studio!');
    } catch (err) {
      setError(err.message || 'Failed to approve story.');
    }
  };

  // Reject Story
  const handleRejectStory = async () => {
    try {
      const res = await newsApi.reject(articleId, 'Rejected from news detail view');
      setArticle(res.data);
      showToast('Story rejected. Excluded from automated post generation.');
    } catch (err) {
      setError(err.message || 'Failed to reject story.');
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="News Story Details">
        <div className="h-72 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!article) {
    return (
      <AppLayout title="Story Not Found">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center max-w-md mx-auto shadow-xs space-y-4 my-8">
          <h2 className="text-base font-bold text-slate-900">News Story Not Found</h2>
          <p className="text-xs text-slate-500">
            {error || 'The requested news story could not be found or you do not have permission to view it.'}
          </p>
          <Link
            href="/discover"
            className="inline-block px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            ← Return to News Feed
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isRejected = article.status === 'rejected';
  const isSelected = article.status === 'selected';

  return (
    <AppLayout
      title="News Intelligence & Research"
      subtitle="Exhaustive multi-source fact-checking, claims verification, and LinkedIn angle synthesis"
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumb & Back Link */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <span>← Back to Discovered Feed</span>
          </Link>

          <div className="flex items-center gap-2">
            {article.topicId && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {article.topicId.name}
              </span>
            )}
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                article.status === 'selected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : article.status === 'rejected'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Status: {article.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>✓ {toast}</span>
            <button onClick={() => setToast('')} className="text-emerald-700 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-700 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Story Header Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-xs">
                {article.publisher || article.sourceName || 'Web Intelligence'}
              </span>
              <span className="text-slate-400">
                &bull; Published {new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-[11px]">
                📰 {article.sourceCount || 1} Independent Source{(article.sourceCount || 1) > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                ⭐ {article.relevanceScore || 80}/100 Relevance Score
              </span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {article.title}
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
            {article.summary}
          </p>

          {/* Quick Header Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              <span>View Original Publication</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            <div className="flex items-center gap-2">
              {!isRejected && (
                <button
                  onClick={handleApproveStory}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {isSelected ? '✓ Approved for Studio' : '+ Approve Story'}
                </button>
              )}

              {!isRejected ? (
                <button
                  onClick={handleRejectStory}
                  className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Reject Story
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800 text-xs font-bold">
                  Story Rejected
                </span>
              )}

              {/* Run Deep Research Button */}
              <button
                onClick={handleTriggerDeepResearch}
                disabled={researching || isRejected}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{researching ? '⏳' : '🔬'}</span>
                <span>{researching ? 'Investigating Web...' : research ? 'Re-run Deep Research' : 'Run Deep Research & Fact-Check'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Deep Research Section */}
        {research ? (
          <div className="space-y-6">
            {/* 1. Main Event Definition */}
            <div className="bg-white border border-blue-200/90 rounded-2xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 text-lg">📌</span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-blue-900">
                  Core Event & Verified Background
                </h2>
              </div>
              <p className="text-base font-bold text-slate-900 leading-snug">
                {research.mainEvent}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {research.summary}
              </p>
            </div>

            {/* 2. Fact-Checking Breakdown: Confirmed Facts vs Uncertain Claims */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Confirmed Claims */}
              <div className="bg-white border border-emerald-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <span className="text-base">✓</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Confirmed Claims ({research.confirmedClaims?.length || 0})
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500">
                  Explicitly verified via official company documentation, public benchmarks, or primary statements.
                </p>
                <div className="space-y-2 pt-1">
                  {research.confirmedClaims?.map((claim, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-emerald-600 font-bold mt-0.5">•</span>
                      <span className="leading-snug">{claim}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uncertain / Speculative Claims */}
              <div className="bg-white border border-amber-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <span className="text-base">⚠️</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Uncertain / Speculative Claims ({research.uncertainClaims?.length || 0})
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500">
                  Rumors, anonymous leaks, or forward-looking projections that have NOT been officially audited.
                </p>
                <div className="space-y-2 pt-1">
                  {research.uncertainClaims?.map((claim, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                      <span className="text-amber-600 font-bold mt-0.5">•</span>
                      <span className="leading-snug">{claim}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Important Numbers & Quantitative Metrics */}
            {research.importantNumbers?.length > 0 && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>📊</span> Important Numbers & Benchmarks
                </h3>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {research.importantNumbers.map((num, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="text-blue-600 font-black">#</span>
                      <span>{num}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Key Entities Involved */}
            {research.entities?.length > 0 && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>🏢</span> Entities & People Involved
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {research.entities.map((ent, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {ent.name || ent}
                        </span>
                        {ent.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                            {ent.category}
                          </span>
                        )}
                      </div>
                      {ent.role && (
                        <p className="text-[11px] font-medium text-blue-700">{ent.role}</p>
                      )}
                      {ent.description && (
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{ent.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Broader Industry Impact */}
            {research.industryImpact && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>🌐</span> Broader Industry Impact & Strategic Shifts
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {research.industryImpact}
                </p>
              </div>
            )}

            {/* 6. LinkedIn Discussion Angles */}
            {research.possibleAngles?.length > 0 && (
              <div className="bg-white border border-indigo-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <span>💡</span> Potential LinkedIn Professional Discussion Angles
                </h3>
                <p className="text-[11px] text-slate-500">
                  Angles structured for executive commentary, architectural trade-offs, and career takeaways.
                </p>
                <div className="space-y-2.5">
                  {research.possibleAngles.map((angle, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-950 font-medium"
                    >
                      <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px]">
                        Angle {idx + 1}
                      </span>
                      <span className="leading-snug">{angle}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Corroborating Multi-Sources List */}
            {research.sources?.length > 0 && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>📰</span> Independent Corroborating Sources ({research.sources.length})
                </h3>
                <div className="divide-y divide-slate-100">
                  {research.sources.map((src, idx) => (
                    <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                        >
                          <span>{src.title || src.url}</span>
                          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <div className="text-[11px] text-slate-400">
                          {src.publisher} &bull; {src.publishedAt ? new Date(src.publishedAt).toLocaleDateString() : 'Recent'}
                        </div>
                      </div>
                      {src.isPrimary ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          Primary Source
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Corroborating
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. Creator Review Notes & Custom Perspectives */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span>✍️</span> Creator Editorial Notes & Perspectives
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add custom insights, company context, or personal anecdotes to guide post generation.
                  </p>
                </div>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>

              <textarea
                rows={3}
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="E.g., In our team, we noticed this exact latency bottleneck 3 months ago. Emphasize why early benchmarking was critical..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed"
              />
            </div>

            {/* Bottom CTA to Proceed to Content Studio */}
            <div className="p-6 bg-slate-900 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold">Research Reviewed & Ready?</h3>
                <p className="text-xs text-slate-400">
                  This story has been fact-checked and verified with multi-source corroboration.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/discover"
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                >
                  Back to Feed
                </Link>
                <Link
                  href="/studio"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  Proceed to Content Studio →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Empty Research State */
          <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center shadow-xs space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">Conduct Deep Investigative Research</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Before generating LinkedIn content, run deep investigative research. The AI will search the live web for the original publication, cross-reference multiple independent sources, separate verified facts from speculation, and formulate strategic discussion angles.
            </p>
            <div className="pt-2">
              <button
                onClick={handleTriggerDeepResearch}
                disabled={researching || isRejected}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <span>{researching ? '⏳' : '🔬'}</span>
                <span>{researching ? 'Conducting Live Web Research...' : 'Start Deep Research & Fact-Check'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function NewsDetailPage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NewsDetailContent paramsPromise={params} />
    </Suspense>
  );
}
