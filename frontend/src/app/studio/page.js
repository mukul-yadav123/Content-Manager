'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { studioApi, newsApi, profileApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

function StudioWorkspaceContent() {
  const searchParams = useSearchParams();
  const preselectedArticleId = searchParams?.get('articleId');
  const draftIdParam = searchParams?.get('draftId');

  const { isAuthenticated, loading: authLoading, user } = useAuth();

  // News & Draft Selection States
  const [candidateArticles, setCandidateArticles] = useState([]);
  const [selectedArticleId, setSelectedArticleId] = useState(preselectedArticleId || '');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [recentDrafts, setRecentDrafts] = useState([]);

  // Active Draft & Version States
  const [currentDraft, setCurrentDraft] = useState(null);
  const [activeApproach, setActiveApproach] = useState('news_update'); // 'news_update' | 'industry_analysis' | 'professional_opinion'
  const [activeVersionType, setActiveVersionType] = useState('active'); // 'active' | 'initial' | 'humanized' | 'user_edited' | 'final_approved'

  // Humanization Parameters
  const [humanizationMode, setHumanizationMode] = useState('professional'); // 'light' | 'professional' | 'conversational'
  const [humanizing, setHumanizing] = useState(false);
  const [approving, setApproving] = useState(false);

  // Generation Input Parameters
  const [targetAudience, setTargetAudience] = useState('Senior software engineers and tech leaders');
  const [contentAngle, setContentAngle] = useState('');
  const [preferredStyle, setPreferredStyle] = useState('authoritative');
  const [isAngleModalOpen, setIsAngleModalOpen] = useState(false);
  const [newAngleInput, setNewAngleInput] = useState('');

  // Editable Post Fields (Active Draft)
  const [isEditing, setIsEditing] = useState(false);
  const [editHook, setEditHook] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCta, setEditCta] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // UI Feedback States
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regeneratingHooks, setRegeneratingHooks] = useState(false);
  const [regeneratingPost, setRegeneratingPost] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // 1. Fetch Candidate Articles (selected / researched / shortlisted)
  const fetchArticles = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingArticles(true);
    try {
      const res = await newsApi.getAll({ limit: 40 });
      const items = res?.data?.items || [];
      const filtered = items.filter((a) => a.status !== 'rejected');
      setCandidateArticles(filtered);

      if (preselectedArticleId) {
        const found = filtered.find((a) => a._id === preselectedArticleId);
        if (found) {
          setSelectedArticle(found);
          setSelectedArticleId(found._id);
        } else {
          const singleRes = await newsApi.getById(preselectedArticleId);
          if (singleRes?.data) {
            setSelectedArticle(singleRes.data);
            setSelectedArticleId(singleRes.data._id);
          }
        }
      } else if (filtered.length > 0 && !selectedArticleId) {
        setSelectedArticle(filtered[0]);
        setSelectedArticleId(filtered[0]._id);
      }
    } catch (err) {
      console.warn('Failed to fetch candidate articles:', err.message);
    } finally {
      setLoadingArticles(false);
    }
  }, [isAuthenticated, preselectedArticleId]);

  // 2. Fetch Recent Drafts
  const fetchDrafts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await studioApi.getDrafts({ limit: 20 });
      const items = res?.data?.items || [];
      setRecentDrafts(items);

      if (draftIdParam) {
        const draftRes = await studioApi.getDraftById(draftIdParam);
        if (draftRes?.data) {
          loadDraftIntoStudio(draftRes.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch drafts:', err.message);
    }
  }, [isAuthenticated, draftIdParam]);

  useEffect(() => {
    fetchArticles();
    fetchDrafts();
  }, [fetchArticles, fetchDrafts]);

  // When selected article changes, update article state and pre-populate audience/angle
  const handleArticleSelect = (id) => {
    setSelectedArticleId(id);
    const found = candidateArticles.find((a) => a._id === id);
    if (found) {
      setSelectedArticle(found);
      if (found.topicId?.name) {
        setTargetAudience(`${found.topicId.name} decision makers and engineering leaders`);
      }
      if (found.deepResearch?.possibleAngles?.length > 0) {
        setContentAngle(found.deepResearch.possibleAngles[0]);
      }
    }
  };

  // Helper to sync current draft into UI state
  const loadDraftIntoStudio = (draft) => {
    setCurrentDraft(draft);
    setActiveApproach(draft.selectedApproach || 'news_update');
    setActiveVersionType('active');
    setEditTitle(draft.title || '');
    setEditHook(draft.hook || '');
    setEditBody(draft.body || '');
    setEditCta(draft.cta || '');
    setContentAngle(draft.contentAngle || '');
    setTargetAudience(draft.targetAudience || 'Industry professionals');
    setPreferredStyle(draft.preferredStyle || 'authoritative');
  };

  // 3. Generate Posts Handler
  const handleGeneratePosts = async () => {
    if (!selectedArticleId) {
      setError('Please select a news article to generate posts.');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const res = await studioApi.generate({
        articleId: selectedArticleId,
        targetAudience,
        contentAngle,
        preferredStyle,
        postFormat: 'standard'
      });

      if (res?.data) {
        loadDraftIntoStudio(res.data);
        showToast('Generated 3 LinkedIn post variations successfully!');
        fetchDrafts();
      }
    } catch (err) {
      setError(err.message || 'Post generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // 4. Switch Active Approach (Variation)
  const handleSelectVariation = async (approach) => {
    if (!currentDraft) return;
    setActiveApproach(approach);

    try {
      const res = await studioApi.selectVariation(currentDraft._id, { approach });
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        showToast(`Switched active approach to ${getApproachLabel(approach)}`);
      }
    } catch (err) {
      console.warn('Could not persist variation selection:', err.message);
    }
  };

  // 5. Select Specific Hook Option
  const handleSelectHook = async (hookText) => {
    if (!currentDraft) return;
    setEditHook(hookText);

    try {
      const res = await studioApi.selectVariation(currentDraft._id, {
        approach: activeApproach,
        selectedHook: hookText
      });
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        showToast('Updated active hook option');
      }
    } catch (err) {
      console.warn('Could not persist hook selection:', err.message);
    }
  };

  // 6. Regenerate Hooks for Current Approach
  const handleRegenerateHooks = async () => {
    if (!currentDraft) return;
    setRegeneratingHooks(true);
    setError('');
    try {
      const res = await studioApi.regenerateHooks(currentDraft._id, {
        approach: activeApproach,
        contentAngle,
        targetAudience
      });
      if (res?.data?.draft) {
        loadDraftIntoStudio(res.data.draft);
        showToast('Generated 3 new hook options!');
      }
    } catch (err) {
      setError(err.message || 'Failed to regenerate hooks.');
    } finally {
      setRegeneratingHooks(false);
    }
  };

  // 7. Regenerate Single Post Approach
  const handleRegeneratePost = async () => {
    if (!currentDraft) return;
    setRegeneratingPost(true);
    setError('');
    try {
      const res = await studioApi.regeneratePost(currentDraft._id, {
        approach: activeApproach,
        contentAngle,
        targetAudience,
        preferredStyle
      });
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        showToast(`Regenerated ${getApproachLabel(activeApproach)} post!`);
      }
    } catch (err) {
      setError(err.message || 'Failed to regenerate post.');
    } finally {
      setRegeneratingPost(false);
    }
  };

  // 8. Change Content Angle
  const handleChangeAngle = async () => {
    if (!currentDraft || !newAngleInput.trim()) return;
    setGenerating(true);
    setError('');
    try {
      const res = await studioApi.changeAngle(currentDraft._id, {
        contentAngle: newAngleInput.trim()
      });
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        setContentAngle(newAngleInput.trim());
        setIsAngleModalOpen(false);
        showToast('Updated angle and regenerated all 3 approaches!');
      }
    } catch (err) {
      setError(err.message || 'Failed to update content angle.');
    } finally {
      setGenerating(false);
    }
  };

  // 9. Humanize Post using Personal Writing Profile (Part B)
  const handleHumanizePost = async () => {
    if (!currentDraft) return;
    setHumanizing(true);
    setError('');
    try {
      const res = await studioApi.humanize(currentDraft._id, {
        mode: humanizationMode,
        contentAngle
      });
      if (res?.data?.draft) {
        loadDraftIntoStudio(res.data.draft);
        showToast(`Post humanized successfully (${humanizationMode} mode)!`);
        fetchDrafts();
      }
    } catch (err) {
      setError(err.message || 'Humanization failed.');
    } finally {
      setHumanizing(false);
    }
  };

  // 10. Approve Draft & Learn from Creator Edits (Part D)
  const handleApproveDraft = async () => {
    if (!currentDraft) return;
    setApproving(true);
    setError('');
    try {
      const res = await studioApi.approve(currentDraft._id);
      if (res?.data?.draft) {
        loadDraftIntoStudio(res.data.draft);
        const sugCount = res.data.newSuggestions?.length || 0;
        showToast(
          sugCount > 0
            ? `Post approved! Synthesized ${sugCount} new profile recommendation(s) for your review.`
            : 'Post approved and marked ready for publishing!'
        );
        fetchDrafts();
      }
    } catch (err) {
      setError(err.message || 'Failed to approve draft.');
    } finally {
      setApproving(false);
    }
  };

  // 11. Revert to a Previous Version
  const handleRevertVersion = async (versionType) => {
    if (!currentDraft) return;
    try {
      const res = await studioApi.revertVersion(currentDraft._id, { versionType });
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        setActiveVersionType(versionType);
        showToast(`Reverted active post to ${versionType.replace('_', ' ')} version`);
      }
    } catch (err) {
      setError(err.message || 'Failed to revert version.');
    }
  };

  // 12. Save Manual Edits
  const handleSaveEdits = async (newStatus = null) => {
    if (!currentDraft) return;
    setSavingDraft(true);
    try {
      const payload = {
        title: editTitle,
        hook: editHook,
        body: editBody,
        cta: editCta
      };
      if (newStatus) {
        payload.status = newStatus;
      }
      const res = await studioApi.updateDraft(currentDraft._id, payload);
      if (res?.data) {
        loadDraftIntoStudio(res.data);
        setIsEditing(false);
        showToast('Draft changes saved successfully!');
        fetchDrafts();
      }
    } catch (err) {
      setError(err.message || 'Failed to save draft edits.');
    } finally {
      setSavingDraft(false);
    }
  };

  // 13. Copy Complete Post to Clipboard
  const handleCopyToClipboard = () => {
    if (!currentDraft) return;
    const activeVar =
      currentDraft.variations?.find((v) => v.approach === activeApproach) || {};

    const formattedPost = `${editHook || currentDraft.hook}

${editBody || currentDraft.body}

Key Takeaways:
${(activeVar.keyTakeaways || currentDraft.keyTakeaways || []).map((t) => `• ${t}`).join('\n')}

${editCta || currentDraft.cta || currentDraft.closingQuestion}

${(activeVar.hashtags || currentDraft.hashtags || []).join(' ')}

${activeVar.sourceAttribution || currentDraft.sourceAttribution || ''}`;

    navigator.clipboard.writeText(formattedPost);
    showToast('Copied full formatted LinkedIn post to clipboard!');
  };

  // Helper labels
  function getApproachLabel(approach) {
    switch (approach) {
      case 'news_update':
        return 'News Update';
      case 'industry_analysis':
        return 'Industry Analysis';
      case 'professional_opinion':
        return 'Professional Opinion';
      default:
        return 'Approach';
    }
  }

  const currentVariation =
    currentDraft?.variations?.find((v) => v.approach === activeApproach) ||
    currentDraft?.variations?.[0];

  const hookOptions = currentVariation?.hookOptions || [];
  const selectedHook = isEditing
    ? editHook
    : currentDraft?.hook || currentVariation?.selectedHook || hookOptions[0];

  return (
    <AppLayout
      title="Content Studio"
      subtitle="Craft, humanize, and preview viral LinkedIn thought leadership"
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700 animate-fade-in">
          <span className="text-emerald-400">✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="font-bold hover:underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Input Configuration & Story Selector (4 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* Story Selection Box */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Select Verified Story
              </h2>
              <Link
                href="/discover"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                + Discover More
              </Link>
            </div>

            {loadingArticles ? (
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : candidateArticles.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2">
                <p className="font-bold">No candidate stories found</p>
                <p className="text-[11px] text-amber-700">
                  Discover news or approve stories from the News Discovery engine first.
                </p>
                <Link
                  href="/discover"
                  className="inline-block px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px]"
                >
                  Go to News Feed →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedArticleId}
                  onChange={(e) => handleArticleSelect(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {candidateArticles.map((art) => (
                    <option key={art._id} value={art._id}>
                      {art.title.length > 55 ? `${art.title.substring(0, 55)}...` : art.title} (
                      {art.publisher || 'Source'})
                    </option>
                  ))}
                </select>

                {/* Selected Article Meta Card */}
                {selectedArticle && (
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs space-y-2">
                    <p className="font-bold text-slate-900 leading-snug">{selectedArticle.title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>{selectedArticle.publisher || 'Unknown'}</span>
                      <span>•</span>
                      <span>Score: {selectedArticle.relevanceScore || 75}/100</span>
                      {selectedArticle.deepResearch ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          🔬 Deep Researched
                        </span>
                      ) : (
                        <Link
                          href={`/discover/${selectedArticle._id}`}
                          className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold hover:underline"
                        >
                          Run Research →
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Strategy & Persona Configuration */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Generation Settings
            </h2>

            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Target Audience</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Senior Software Engineers, Startup Founders"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Tech Founders', 'Engineering Leads', 'Product Managers', 'AI Researchers'].map(
                  (preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetAudience(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      {preset}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Content Angle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Content Angle</label>
              <input
                type="text"
                value={contentAngle}
                onChange={(e) => setContentAngle(e.target.value)}
                placeholder="e.g. Developer productivity gains, Strategic tradeoffs"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Direct Impact', 'Industry Ripple Effects', 'Critical Tradeoffs', 'Pragmatic Execution'].map(
                  (angle) => (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => setContentAngle(angle)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                    >
                      {angle}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Tone & Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tone & Style</label>
              <select
                value={preferredStyle}
                onChange={(e) => setPreferredStyle(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="authoritative">Authoritative & Strategic</option>
                <option value="conversational">Conversational & Accessible</option>
                <option value="analytical">Analytical & Metric-Driven</option>
                <option value="contrarian">Pragmatic & Contrarian</option>
                <option value="storytelling">Narrative Breakdown</option>
              </select>
            </div>

            {/* Generate Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGeneratePosts}
                disabled={generating || !selectedArticleId}
                className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  generating || !selectedArticleId
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing 3 Distinct Approaches...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Generate 3 LinkedIn Post Approaches</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Humanization Control Box (Part B) */}
          {currentDraft && (
            <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 border border-indigo-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">👤</span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                    AI Humanization Engine
                  </h2>
                </div>
                <Link
                  href="/profile"
                  className="text-[11px] font-bold text-indigo-700 hover:underline"
                >
                  Edit Profile →
                </Link>
              </div>

              <p className="text-xs text-indigo-900 leading-relaxed">
                Transform raw AI copy using your personal writing profile. Strips clichés, introduces dynamic
                sentence cadence, and preserves verified facts.
              </p>

              {/* Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-indigo-900">Humanization Intensity</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'light', label: 'Light', desc: 'De-AI-ify only' },
                    { id: 'professional', label: 'Natural Prof', desc: 'Executive rhythm' },
                    { id: 'conversational', label: 'Conversational', desc: 'Dynamic cadence' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setHumanizationMode(m.id)}
                      className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                        humanizationMode === m.id
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                          : 'bg-white/80 border-indigo-200 text-indigo-950 hover:bg-white text-xs'
                      }`}
                    >
                      <span className="block text-xs font-bold">{m.label}</span>
                      <span className="text-[9px] opacity-80 block truncate">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleHumanizePost}
                disabled={humanizing}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400"
              >
                {humanizing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Humanizing with Your Voice...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Humanize Post with My Voice</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Recent Drafts Drawer */}
          {recentDrafts.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recent Generated Drafts
              </h2>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                {recentDrafts.map((d) => (
                  <button
                    key={d._id}
                    onClick={() => loadDraftIntoStudio(d)}
                    className={`w-full text-left py-2.5 px-2 rounded-lg transition-colors flex items-center justify-between text-xs cursor-pointer ${
                      currentDraft?._id === d._id
                        ? 'bg-blue-50/80 font-bold text-blue-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="truncate font-semibold">{d.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {getApproachLabel(d.selectedApproach)} • {d.status}{' '}
                        {d.isHumanized && <span className="text-purple-600 font-bold">• Humanized</span>}
                      </p>
                    </div>
                    <span className="text-slate-400 text-xs">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: 3-Approach Studio Preview & Editor (8 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {!currentDraft ? (
            /* Empty State: Prompt User to Generate */
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Ready to Generate High-Signal LinkedIn Copy
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Choose a news article and target audience from the left panel, then click{' '}
                <span className="font-semibold text-slate-700">"Generate 3 LinkedIn Post Approaches"</span>.
              </p>
            </div>
          ) : (
            /* Active Post Studio Workspace */
            <div className="space-y-6">
              {/* Version History Selector Tabs (Part D) */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <span>Draft History:</span>
                  <button
                    type="button"
                    onClick={() => handleRevertVersion('initial')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      activeVersionType === 'initial'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    1. Initial AI
                  </button>
                  {currentDraft.humanizedDraft?.body && (
                    <button
                      type="button"
                      onClick={() => handleRevertVersion('humanized')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        activeVersionType === 'humanized'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      2. Humanized ({currentDraft.humanizationMode || 'prof'})
                    </button>
                  )}
                  {currentDraft.userEditedDraft?.body && (
                    <button
                      type="button"
                      onClick={() => handleRevertVersion('user_edited')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        activeVersionType === 'user_edited'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                      }`}
                    >
                      3. User Edits
                    </button>
                  )}
                  {currentDraft.finalApprovedDraft?.body && (
                    <button
                      type="button"
                      onClick={() => handleRevertVersion('final_approved')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        activeVersionType === 'final_approved'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      4. Final Approved ✓
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    {currentDraft.versions?.length || 1} versions tracked
                  </span>
                </div>
              </div>

              {/* 3-Approach Selector Tabs */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'news_update',
                      label: 'News Update',
                      desc: 'What happened & why it matters',
                      icon: '📰',
                      activeColor: 'border-blue-600 bg-blue-50/60 text-blue-900'
                    },
                    {
                      id: 'industry_analysis',
                      label: 'Industry Analysis',
                      desc: 'Macro trends & ripple effects',
                      icon: '📊',
                      activeColor: 'border-purple-600 bg-purple-50/60 text-purple-900'
                    },
                    {
                      id: 'professional_opinion',
                      label: 'Professional Opinion',
                      desc: 'Insightful discussion & tradeoffs',
                      icon: '💡',
                      activeColor: 'border-emerald-600 bg-emerald-50/60 text-emerald-900'
                    }
                  ].map((tab) => {
                    const isActive = activeApproach === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleSelectVariation(tab.id)}
                        className={`p-3 rounded-xl text-left border-2 transition-all cursor-pointer ${
                          isActive
                            ? tab.activeColor
                            : 'border-transparent hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{tab.icon}</span>
                          <span>{tab.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{tab.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hook Carousel / Selector */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Opening Hook Variations (Select One)
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                      {hookOptions.length} Options
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerateHooks}
                    disabled={regeneratingHooks}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{regeneratingHooks ? '⏳' : '🔄'}</span>
                    <span>{regeneratingHooks ? 'Regenerating...' : 'Regenerate Hooks'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {hookOptions.map((hookText, index) => {
                    const isSelected = selectedHook === hookText;
                    return (
                      <div
                        key={index}
                        onClick={() => handleSelectHook(hookText)}
                        className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 text-slate-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className={isSelected ? 'text-blue-700' : 'text-slate-400'}>
                              Option #{index + 1}
                            </span>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px]">
                                Active Hook
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium leading-relaxed">{hookText}</p>
                        </div>
                        <div className="pt-2 text-[10px] text-slate-400">
                          {hookText.length} characters
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quality Evaluation Card (Part C) */}
              {currentDraft.qualityEvaluation && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🎯</span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Humanization Quality Evaluation
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Overall {currentDraft.qualityEvaluation.overallQualityScore}/100
                      </span>
                    </div>
                    {currentDraft.qualityEvaluation.genericFillerDetected?.length === 0 ? (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <span>✓</span>
                        <span>Zero Generic AI Filler</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-600">
                        {currentDraft.qualityEvaluation.genericFillerDetected.length} Cliche(s) Flagged
                      </span>
                    )}
                  </div>

                  {/* 6 Score Meters */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Naturalness</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.naturalnessScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Profile Match</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.profileConsistencyScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Clarity</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.clarityScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Engagement</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.engagementPotentialScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Relevance</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.relevanceScore}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Factual Accuracy</span>
                      <span className="text-sm font-bold text-slate-900">
                        {currentDraft.qualityEvaluation.factualConsistencyScore}%
                      </span>
                    </div>
                  </div>

                  {currentDraft.qualityEvaluation.feedbackNotes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                      &ldquo;{currentDraft.qualityEvaluation.feedbackNotes}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* LinkedIn Post Mockup & Editor */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                {/* Header bar */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">
                      {getApproachLabel(activeApproach)} Preview
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold uppercase">
                      {currentDraft.status || 'draft'}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({currentDraft.wordCount || 0} words • {currentDraft.characterCount || 0} chars)
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAngleModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      📐 Change Angle
                    </button>
                    <button
                      type="button"
                      onClick={handleRegeneratePost}
                      disabled={regeneratingPost}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      {regeneratingPost ? 'Regenerating Post...' : '🔄 Regenerate Post'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        isEditing
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'border border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isEditing ? 'Editing Mode' : '✏️ Edit Text'}
                    </button>
                  </div>
                </div>

                {/* LinkedIn Feed Card Mockup */}
                <div className="p-6 space-y-4">
                  {/* Mock Profile Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <span>{user?.name || 'Thought Leader'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">• 1st</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {user?.headline || 'Tech Strategist & Industry Operator'}
                      </p>
                      <p className="text-[10px] text-slate-400">Just now • 🌐</p>
                    </div>
                  </div>

                  {/* Post Content Area */}
                  {isEditing ? (
                    /* Inline Editing Mode */
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Opening Hook</label>
                        <textarea
                          rows={2}
                          value={editHook}
                          onChange={(e) => setEditHook(e.target.value)}
                          className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Post Body</label>
                        <textarea
                          rows={10}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="w-full text-xs font-normal leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Closing Question / CTA</label>
                        <input
                          type="text"
                          value={editCta}
                          onChange={(e) => setEditCta(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEdits()}
                          disabled={savingDraft}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          {savingDraft ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-Only Formatted Post Preview */
                    <div className="space-y-4 pt-1">
                      {/* Hook */}
                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        {selectedHook}
                      </p>

                      {/* Body */}
                      <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line space-y-2">
                        {currentDraft.body || currentVariation?.content}
                      </div>

                      {/* Key Takeaways Box */}
                      {currentVariation?.keyTakeaways?.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                          <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                            Key Takeaways
                          </p>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600">
                            {currentVariation.keyTakeaways.map((takeaway, i) => (
                              <li key={i}>{takeaway}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Closing Question */}
                      <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs font-semibold text-blue-950">
                        {currentDraft.cta || currentVariation?.closingQuestion}
                      </div>

                      {/* Hashtags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(currentVariation?.hashtags || currentDraft.hashtags || []).map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                          >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>

                      {/* Source Attribution */}
                      <p className="text-[11px] text-slate-400 italic pt-1">
                        {currentVariation?.sourceAttribution || currentDraft.sourceAttribution}
                      </p>
                    </div>
                  )}

                  {/* Suggested Image Concept Box */}
                  {currentVariation?.suggestedImageConcept && (
                    <div className="mt-4 p-4 rounded-xl bg-purple-50/60 border border-purple-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900">
                        <span>🖼️</span>
                        <span>Suggested Visual Brief / Graphic Concept:</span>
                      </div>
                      <p className="text-purple-800 leading-relaxed">
                        {currentVariation.suggestedImageConcept}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Controls: Approve, Copy & Status Save */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-semibold">Workflow Status:</span>
                    {['draft', 'reviewing', 'ready'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleSaveEdits(st)}
                        className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase transition-colors cursor-pointer ${
                          currentDraft.status === st
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleApproveDraft}
                      disabled={approving}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>✓</span>
                      <span>{approving ? 'Approving...' : 'Approve & Learn from Edits'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyToClipboard}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📋</span>
                      <span>Copy Formatted Post</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Angle Modal */}
      {isAngleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Change Content Angle</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Updating the content angle will re-synthesize all 3 post variations (News Update, Industry Analysis, and Professional Opinion) through this specific lens.
            </p>
            <input
              type="text"
              value={newAngleInput}
              onChange={(e) => setNewAngleInput(e.target.value)}
              placeholder="e.g. Enterprise AI Governance and Developer Velocity"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAngleModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangeAngle}
                disabled={generating || !newAngleInput.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {generating ? 'Re-synthesizing...' : 'Apply & Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function ContentStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StudioWorkspaceContent />
    </Suspense>
  );
}
