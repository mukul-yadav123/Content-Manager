'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NewsCard({
  article,
  onApprove,
  onReject,
  onEvaluate,
  onDelete,
  actionLoading
}) {
  const [showFacts, setShowFacts] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isSelected = article.status === 'selected';
  const isShortlisted = article.status === 'shortlisted';
  const isRejected = article.status === 'rejected';
  const isEvaluated = article.status === 'evaluated';

  // Format publication date into human-readable freshness label
  const getFreshnessDetails = (dateString) => {
    if (!dateString) return { label: 'Recent', badgeColor: 'bg-slate-100 text-slate-600 border-slate-200' };
    const pub = new Date(dateString);
    const now = new Date();
    const diffHours = Math.max(0, (now.getTime() - pub.getTime()) / (1000 * 60 * 60));

    if (diffHours < 6) {
      return {
        label: `Breaking (${Math.round(diffHours)}h ago)`,
        dot: 'bg-emerald-500 animate-pulse',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    }
    if (diffHours < 24) {
      return {
        label: `Fresh (${Math.round(diffHours)}h ago)`,
        dot: 'bg-blue-500',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
      };
    }
    if (diffHours < 48) {
      return {
        label: 'Past 48h',
        dot: 'bg-indigo-400',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      };
    }
    if (diffHours < 168) {
      return {
        label: `${Math.round(diffHours / 24)}d ago`,
        dot: 'bg-amber-400',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
      };
    }
    return {
      label: 'Older (> 7d)',
      dot: 'bg-slate-300',
      badgeColor: 'bg-slate-100 text-slate-500 border-slate-200'
    };
  };

  const freshness = getFreshnessDetails(article.publishedAt);
  const finalScore = article.relevanceScore ?? 80;
  const breakdown = article.scoreBreakdown || {
    recency: 80,
    topicRelevance: 80,
    discussionPotential: 75,
    sourceQuality: 80
  };

  // Determine score badge style
  const getScoreBadgeClass = (score) => {
    if (score >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (score >= 70) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const handleConfirmReject = () => {
    onReject(article._id, rejectReason);
    setIsRejecting(false);
  };

  return (
    <div
      className={`bg-white border rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between ${
        isSelected
          ? 'border-emerald-500/80 ring-1 ring-emerald-500/30'
          : isShortlisted
          ? 'border-blue-400/80 ring-1 ring-blue-400/20'
          : isRejected
          ? 'border-red-200/80 bg-red-50/20 opacity-80'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="space-y-3.5">
        {/* Top Badges & Freshness Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          {/* Publisher & Source Count */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/70 text-[11px]">
              {article.publisher || article.sourceName || 'Web Intelligence'}
            </span>

            {/* Source Count Indicator */}
            <span
              title={`${article.sourceCount || 1} independent source(s) reporting on this development`}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                (article.sourceCount || 1) >= 2
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              <span>📰</span>
              <span>{article.sourceCount || 1} Source{(article.sourceCount || 1) > 1 ? 's' : ''}</span>
            </span>

            {/* Freshness Badge */}
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${freshness.badgeColor}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${freshness.dot || 'bg-slate-400'}`} />
              <span>{freshness.label}</span>
            </span>
          </div>

          {/* Relevance Score & Status Badges */}
          <div className="flex items-center gap-2">
            {article.topicId && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {article.topicId.name || 'Topic'}
              </span>
            )}

            {/* Clickable Score Gauge */}
            <button
              type="button"
              onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
              title="Click to view 4-criteria score breakdown"
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition-all ${getScoreBadgeClass(
                finalScore
              )}`}
            >
              <span>⭐ {finalScore}</span>
              <span className="text-[9px] font-medium opacity-75">/100</span>
            </button>
          </div>
        </div>

        {/* Score Breakdown Dropdown Panel */}
        {showScoreBreakdown && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 animate-in fade-in duration-100">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-b border-slate-200/80 pb-1">
              <span>Scoring Breakdown</span>
              <span className="text-blue-600 font-extrabold">{finalScore}/100 Final Score</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500">Recency (30%):</span>{' '}
                <span className="font-bold text-slate-800">{breakdown.recency}/100</span>
              </div>
              <div>
                <span className="text-slate-500">Topic Relevance (30%):</span>{' '}
                <span className="font-bold text-slate-800">{breakdown.topicRelevance}/100</span>
              </div>
              <div>
                <span className="text-slate-500">Discussion Potential (20%):</span>{' '}
                <span className="font-bold text-slate-800">{breakdown.discussionPotential}/100</span>
              </div>
              <div>
                <span className="text-slate-500">Source Quality (20%):</span>{' '}
                <span className="font-bold text-slate-800">{breakdown.sourceQuality}/100</span>
              </div>
            </div>
          </div>
        )}

        {/* Headline */}
        <div>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-2 leading-snug tracking-tight inline-flex items-baseline gap-1"
          >
            <span>{article.title}</span>
            <svg
              className="w-3.5 h-3.5 text-slate-400 inline shrink-0 self-center"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        {/* Summary */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
          {article.summary}
        </p>

        {/* Why Shortlisted & Why Interesting for LinkedIn Callout */}
        {(article.shortlistReason || article.linkedInAngle) && (
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-lg p-3 space-y-2 text-xs">
            {article.shortlistReason && (
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                  <span>🎯</span> Why Shortlisted
                </span>
                <p className="text-[11px] text-slate-700 leading-snug">
                  {article.shortlistReason}
                </p>
              </div>
            )}

            {article.linkedInAngle && (
              <div className="space-y-0.5 pt-1 border-t border-slate-200/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                  <span>💡</span> Why It Matters for LinkedIn
                </span>
                <p className="text-[11px] text-slate-700 leading-snug">
                  {article.linkedInAngle}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Multi-Sources Sub-links if present */}
        {article.sources?.length > 1 && (
          <div className="text-[11px] text-slate-500 space-y-1">
            <span className="font-semibold text-slate-700">Corroborating Sources:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {article.sources.map((s, idx) => (
                <a
                  key={idx}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] text-slate-700 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <span>{s.publisher}</span>
                  {s.isPrimary && <span className="text-blue-600 font-bold">(Primary)</span>}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Rejection Warning if status is rejected */}
        {isRejected && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
            <span className="text-red-500 font-bold text-sm leading-none mt-0.5">✕</span>
            <div>
              <p className="font-bold text-[11px]">Rejected Story</p>
              <p className="text-[11px] text-red-700 leading-snug">
                {article.rejectionReason || 'Excluded from automated and manual post generation.'}
              </p>
            </div>
          </div>
        )}

        {/* Facts Accordion */}
        {article.facts?.length > 0 && (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setShowFacts(!showFacts)}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{showFacts ? 'Hide Key Facts' : `View Key Facts (${article.facts.length})`}</span>
              <svg
                className={`w-3.5 h-3.5 transform transition-transform ${showFacts ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showFacts && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1.5 animate-in fade-in duration-100">
                {article.facts.map((fact, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                    <span className="text-blue-500 font-bold leading-none mt-1">•</span>
                    <span className="leading-snug">{fact}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        {/* Links */}
        <div className="flex items-center gap-3">
          <Link
            href={`/discover/${article._id}`}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
          >
            <span>🔬 Deep Research</span>
            {article.hasDeepResearch && (
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
                ✓
              </span>
            )}
          </Link>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
          >
            <span>Original</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Evaluate Button (if discovered or un-evaluated) */}
          {article.status === 'discovered' && onEvaluate && (
            <button
              onClick={() => onEvaluate(article._id)}
              disabled={actionLoading}
              title="Evaluate and rank with AI"
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>⚡</span>
              <span>Evaluate</span>
            </button>
          )}

          {/* Delete Action */}
          <button
            onClick={() => onDelete(article._id)}
            title="Delete Story"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>

          {/* Reject Action */}
          {!isRejected ? (
            !isRejecting ? (
              <button
                onClick={() => setIsRejecting(true)}
                disabled={actionLoading}
                title="Reject Story (exclude from post generation)"
                className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Reject
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                <input
                  type="text"
                  placeholder="Reason..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-20 px-1.5 py-0.5 text-[10px] rounded border border-red-300 bg-white"
                />
                <button
                  onClick={handleConfirmReject}
                  className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded cursor-pointer"
                >
                  ✓
                </button>
                <button
                  onClick={() => setIsRejecting(false)}
                  className="px-1 py-0.5 text-slate-500 text-[10px] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )
          ) : (
            <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-[11px] font-bold">
              Rejected
            </span>
          )}

          {/* Approve / Select Action */}
          {!isRejected && (
            <button
              onClick={() => onApprove(article._id)}
              disabled={actionLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSelected ? (
                <>
                  <span>✓</span>
                  <span>Approved</span>
                </>
              ) : (
                <>
                  <span>+</span>
                  <span>Approve</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
