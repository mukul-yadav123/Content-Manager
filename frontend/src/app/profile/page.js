'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { profileApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function WritingProfilePage() {
  const { user, isAuthenticated } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'samples'

  // Sample Management State
  const [samples, setSamples] = useState([]);
  const [newSampleInput, setNewSampleInput] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [preferredStyle, setPreferredStyle] = useState('authoritative');
  const [analyzing, setAnalyzing] = useState(false);

  // Manual Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTone, setEditTone] = useState('');
  const [editToneOfVoice, setEditToneOfVoice] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editBannedWords, setEditBannedWords] = useState('');
  const [newBannedWordInput, setNewBannedWordInput] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Suggestions State
  const [suggestionLoadingId, setSuggestionLoadingId] = useState(null);

  // UI Feedback
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Fetch writing profile
  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError('');
    try {
      const res = await profileApi.getProfile();
      if (res?.data) {
        setProfile(res.data);
        setSamples(res.data.samplePosts || []);
        setCustomInstructions(res.data.customInstructions || '');
        setPreferredStyle(res.data.preferredStyle || 'authoritative');
        setEditTone(res.data.tone || '');
        setEditToneOfVoice(res.data.toneOfVoice || '');
        setEditInstructions(res.data.customInstructions || '');
        setEditBannedWords((res.data.phrasesToAvoid || res.data.forbiddenWords || []).join(', '));
      }
    } catch (err) {
      setError(err.message || 'Failed to load writing profile.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Add individual sample post to staging
  const handleAddSample = () => {
    if (!newSampleInput.trim()) return;
    if (newSampleInput.trim().length < 20) {
      setError('Sample post must be at least 20 characters.');
      return;
    }
    const updated = [...samples, newSampleInput.trim()];
    setSamples(updated);
    setNewSampleInput('');
    showToast(`Added sample #${updated.length}`);
  };

  // Remove sample post
  const handleRemoveSample = (index) => {
    const updated = samples.filter((_, i) => i !== index);
    setSamples(updated);
  };

  // File document upload for writing samples (.txt or .md)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string' && text.trim()) {
        // Split by markdown headers or triple dashes if multiple samples, or add as single document
        const chunks = text
          .split(/(?:---+|===+|###\s+Sample)/)
          .map((c) => c.trim())
          .filter((c) => c.length > 20);

        if (chunks.length > 1) {
          const updated = [...samples, ...chunks];
          setSamples(updated);
          showToast(`Imported ${chunks.length} samples from ${file.name}`);
        } else {
          const updated = [...samples, text.trim()];
          setSamples(updated);
          showToast(`Imported sample document from ${file.name}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Trigger Forensic AI Analysis
  const handleAnalyzeSamples = async () => {
    if (samples.length === 0) {
      setError('Please add or upload at least 1 writing sample (3-10 recommended).');
      return;
    }

    setAnalyzing(true);
    setError('');
    try {
      const res = await profileApi.analyzeSamples({
        samples,
        customInstructions,
        preferredStyle
      });

      if (res?.data) {
        setProfile(res.data);
        setActiveTab('profile');
        showToast('Extracted your 12 personal writing traits successfully!');
      }
    } catch (err) {
      setError(err.message || 'Forensic profile analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Save manual edits
  const handleSaveManualEdits = async () => {
    setSavingEdit(true);
    setError('');
    try {
      const phrasesArray = editBannedWords
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean);

      const res = await profileApi.updateProfile({
        tone: editTone,
        toneOfVoice: editToneOfVoice,
        customInstructions: editInstructions,
        phrasesToAvoid: phrasesArray,
        forbiddenWords: phrasesArray
      });

      if (res?.data) {
        setProfile(res.data);
        setIsEditing(false);
        showToast('Writing profile updated successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Add banned phrase chip
  const handleAddBannedWord = async () => {
    if (!newBannedWordInput.trim() || !profile) return;
    const word = newBannedWordInput.trim().toLowerCase();
    const current = profile.phrasesToAvoid || profile.forbiddenWords || [];
    if (!current.includes(word)) {
      const updated = [...current, word];
      try {
        const res = await profileApi.updateProfile({
          phrasesToAvoid: updated,
          forbiddenWords: updated
        });
        if (res?.data) {
          setProfile(res.data);
          setNewBannedWordInput('');
          showToast(`Added "${word}" to banned phrases`);
        }
      } catch (err) {
        setError(err.message || 'Could not add banned word.');
      }
    }
  };

  // Remove banned phrase chip
  const handleRemoveBannedWord = async (wordToRemove) => {
    if (!profile) return;
    const current = profile.phrasesToAvoid || profile.forbiddenWords || [];
    const updated = current.filter((w) => w !== wordToRemove);
    try {
      const res = await profileApi.updateProfile({
        phrasesToAvoid: updated,
        forbiddenWords: updated
      });
      if (res?.data) {
        setProfile(res.data);
        showToast(`Removed "${wordToRemove}"`);
      }
    } catch (err) {
      setError(err.message || 'Could not remove phrase.');
    }
  };

  // Accept or dismiss a learned suggestion from repeated user edits
  const handleSuggestionAction = async (suggestionId, action) => {
    setSuggestionLoadingId(suggestionId);
    try {
      const res = await profileApi.handleSuggestion(suggestionId, action);
      if (res?.data) {
        setProfile(res.data);
        showToast(
          action === 'accept'
            ? 'Accepted suggestion and updated your writing profile!'
            : 'Suggestion dismissed'
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to update suggestion.');
    } finally {
      setSuggestionLoadingId(null);
    }
  };

  // Reset to defaults
  const handleResetDefaults = async () => {
    if (!confirm('Are you sure you want to reset your writing profile to clean defaults?')) return;
    try {
      const res = await profileApi.resetDefault();
      if (res?.data) {
        setProfile(res.data);
        showToast('Profile reset to standard clean defaults');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset profile.');
    }
  };

  const pendingSuggestions = (profile?.learnedSuggestions || []).filter(
    (s) => s.status === 'pending'
  );

  return (
    <AppLayout
      title="Personal Writing Profile"
      subtitle="Analyze your past LinkedIn posts to extract your authentic voice, cadence, and editorial guidelines"
    >
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-slate-700 animate-fade-in">
          <span className="text-emerald-400">✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Error Alert */}
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

      {/* Header Profile Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xl flex items-center justify-center shadow-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">{profile?.profileName || 'Default Voice'}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                Active Profile
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {profile?.tone || 'Authoritative yet accessible, conversational, punchy'}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
              <span>{profile?.samplePosts?.length || 0} Writing Samples</span>
              <span>•</span>
              <span>
                {profile?.analysisMetadata?.analyzedAt
                  ? `Last analyzed ${new Date(profile.analysisMetadata.analyzedAt).toLocaleDateString()}`
                  : 'Default calibration'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📋 Voice Inspector
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'samples'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🔬 Add Samples & Re-analyze</span>
            {samples.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {samples.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading writing personality profile...</p>
        </div>
      ) : activeTab === 'samples' ? (
        /* ========================================================= */
        /* SAMPLES & ONBOARDING / RE-ANALYSIS WORKFLOW               */
        /* ========================================================= */
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Calibrate Your Personal Writing Profile
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Paste 3 to 10 of your high-performing previous LinkedIn posts, or upload a text document.
                The AI will forensically analyze your sentence rhythm, vocabulary density, opening hook habits,
                and formatting rules to ensure every generated post sounds unmistakably like you.
              </p>
            </div>

            {/* Input Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Preferred Style Persona</label>
                <select
                  value={preferredStyle}
                  onChange={(e) => setPreferredStyle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="authoritative">Authoritative & Strategic</option>
                  <option value="conversational">Conversational & Accessible</option>
                  <option value="analytical">Analytical & Metric-Driven</option>
                  <option value="contrarian">Pragmatic & Contrarian</option>
                  <option value="storyteller">Narrative Case-Study</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Custom Writing Instructions</label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Keep sentences punchy. Never use mountain metaphors."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Add Sample Box */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Paste Previous LinkedIn Post Sample
                </label>
                <label className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1">
                  <span>📄 Upload .txt / .md File</span>
                  <input
                    type="file"
                    accept=".txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={4}
                value={newSampleInput}
                onChange={(e) => setNewSampleInput(e.target.value)}
                placeholder="Paste the full text of a past post you wrote..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleAddSample}
                  disabled={!newSampleInput.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer disabled:bg-slate-300"
                >
                  + Add Writing Sample
                </button>
              </div>
            </div>

            {/* Current Staged Samples Gallery */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Staged Writing Samples ({samples.length} items)
                </h3>
                {samples.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSamples([])}
                    className="text-[11px] text-red-600 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {samples.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-400">
                  No writing samples added yet. Paste past posts above or upload a text file to calibrate your profile.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {samples.map((sampleText, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span>Sample #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSample(idx)}
                          className="text-red-500 hover:text-red-700 cursor-pointer font-bold"
                        >
                          ✕ Remove
                        </button>
                      </div>
                      <p className="text-slate-700 line-clamp-4 leading-relaxed font-serif italic">
                        &ldquo;{sampleText}&rdquo;
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {sampleText.split(/\s+/).filter(Boolean).length} words • {sampleText.length} chars
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Run Analysis Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {samples.length < 3
                  ? `Tip: Adding at least 3 samples guarantees higher accuracy (currently ${samples.length}).`
                  : 'Ready for deep forensic profile analysis.'}
              </span>
              <button
                type="button"
                onClick={handleAnalyzeSamples}
                disabled={analyzing || samples.length === 0}
                className={`px-6 py-3 rounded-xl font-bold text-xs text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer ${
                  analyzing || samples.length === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {analyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Writing Traits...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Analyze Writing Samples with AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* VOICE INSPECTOR & PROFILE DASHBOARD                      */
        /* ========================================================= */
        <div className="space-y-6">
          {/* Learned Suggestions from User Edits (Part D) */}
          {pendingSuggestions.length > 0 && (
            <div className="bg-amber-50/70 border-2 border-amber-300/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">💡</span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Recommendations Learned from Your Recent Edits ({pendingSuggestions.length})
                  </h3>
                  <p className="text-xs text-amber-800 mt-0.5">
                    We noticed repeated patterns in how you manually edit approved posts. Review and accept
                    these suggestions to incorporate them into your profile without silent modifications.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingSuggestions.map((sug) => (
                  <div
                    key={sug._id}
                    className="p-4 rounded-xl bg-white border border-amber-200 text-xs space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold uppercase">
                        {sug.ruleType.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(sug.detectedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900">{sug.suggestedSetting}</p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {sug.rationale}
                      </p>
                    </div>

                    {sug.examples?.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-slate-50 text-[11px] text-slate-600 space-y-1">
                        <span className="font-bold text-slate-500 text-[10px] block">Observed Diff:</span>
                        {sug.examples.map((ex, i) => (
                          <p key={i} className="italic line-clamp-2">
                            {ex}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleSuggestionAction(sug._id, 'dismiss')}
                        disabled={suggestionLoadingId === sug._id}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-xs cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSuggestionAction(sug._id, 'accept')}
                        disabled={suggestionLoadingId === sug._id}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                      >
                        {suggestionLoadingId === sug._id ? 'Applying...' : 'Accept Suggestion'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 12 Forensic Personality Traits Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Tone of Voice & Vocabulary (7 cols) */}
            <div className="md:col-span-7 space-y-6">
              {/* Tone Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tone of Voice & Reader Resonance
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    {isEditing ? 'Close Editor' : '✏️ Edit Profile'}
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Voice Summary</label>
                      <input
                        type="text"
                        value={editTone}
                        onChange={(e) => setEditTone(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Tone of Voice Description</label>
                      <textarea
                        rows={3}
                        value={editToneOfVoice}
                        onChange={(e) => setEditToneOfVoice(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Custom Directives</label>
                      <input
                        type="text"
                        value={editInstructions}
                        onChange={(e) => setEditInstructions(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveManualEdits}
                        disabled={savingEdit}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        {savingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      {profile?.toneOfVoice || profile?.tone}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {profile?.storytellingPreferences ||
                        'Observer perspective using industry case studies rather than fabricated anecdotes.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Pacing, Vocabulary & Opinion Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Vocabulary</span>
                  <p className="text-sm font-bold text-slate-900 capitalize">
                    {profile?.vocabularyComplexity?.level || 'Moderate'}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {profile?.vocabularyComplexity?.description || 'Clean professional terminology'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Sentence Cadence</span>
                  <p className="text-sm font-bold text-slate-900">
                    ~{profile?.sentenceLength?.averageWords || 12} words
                  </p>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {profile?.sentenceLength?.style || 'Varied'} flow
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Paragraph Pacing</span>
                  <p className="text-sm font-bold text-slate-900">
                    ~{profile?.paragraphLength?.averageSentences || 2} lines
                  </p>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {profile?.paragraphLength?.style || 'Short'} chunks
                  </p>
                </div>
              </div>

              {/* Opening Hook Patterns */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Signature Opening Hook Patterns
                </h3>
                <div className="space-y-2">
                  {(profile?.hookPatterns || []).map((pattern, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="text-slate-800 font-medium">{pattern}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Forbidden Words, Expressions & Formatting (5 cols) */}
            <div className="md:col-span-5 space-y-6">
              {/* Banned AI Clichés & Phrases to Avoid */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Banned Phrases & AI Clichés
                  </h3>
                  <span className="text-[10px] text-red-600 font-bold">Auto-Stripped</span>
                </div>

                {/* Add new banned phrase */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newBannedWordInput}
                    onChange={(e) => setNewBannedWordInput(e.target.value)}
                    placeholder="e.g. delve, tapestry"
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddBannedWord}
                    disabled={!newBannedWordInput.trim()}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer disabled:bg-slate-300"
                  >
                    + Ban
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {(profile?.phrasesToAvoid || profile?.forbiddenWords || []).map((word, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold flex items-center gap-1.5"
                    >
                      <span>✕ {word}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBannedWord(word)}
                        className="hover:text-red-900 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Formatting & Stylistic Preferences */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Formatting Habits
                </h3>
                <div className="space-y-2 text-xs text-slate-700 divide-y divide-slate-100">
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">Bullet Point Style</span>
                    <span className="font-bold text-slate-900">
                      {profile?.formattingHabits?.bulletStyle || '•'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">Emoji Frequency</span>
                    <span className="font-bold text-slate-900 capitalize">
                      {profile?.emojiFrequency || 'Minimal'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">Hashtag Habit</span>
                    <span className="font-bold text-slate-900">
                      {profile?.hashtagUsage?.preferredCount || 3} targeted tags
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-500">Paragraph Spacing</span>
                    <span className="font-bold text-slate-900 capitalize">
                      {profile?.formattingHabits?.paragraphSpacing || 'Airy'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Common Expressions */}
              {profile?.commonExpressions?.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Signature Expressions
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.commonExpressions.map((expr, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-medium"
                      >
                        &ldquo;{expr}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-slate-500 hover:text-red-600 font-semibold cursor-pointer text-xs"
                >
                  Reset Defaults
                </button>
                <Link
                  href="/studio"
                  className="text-blue-600 hover:text-blue-700 font-bold"
                >
                  Go to Content Studio →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
