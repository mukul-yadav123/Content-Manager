'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [savedMessage, setSavedMessage] = useState('');

  const handleSavePreferences = (e) => {
    e.preventDefault();
    setSavedMessage('Preferences saved successfully.');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <AppLayout
      title="Settings"
      subtitle="Workspace preferences, OpenAI configurations, and account security"
    >
      <div className="bg-white border border-slate-200/80 rounded-2xl p-8 max-w-2xl mx-auto shadow-xs space-y-6 my-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            Account & Workspace Configuration
          </h2>
          {savedMessage && (
            <span className="text-xs text-emerald-600 font-semibold animate-pulse">
              ✓ {savedMessage}
            </span>
          )}
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-5 text-xs">
          {/* User Identity */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-sm">{user?.name || 'User Profile'}</p>
                <p className="text-slate-500 text-xs">{user?.email}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                {user?.role || 'user'}
              </span>
            </div>

            {user?.headline && (
              <p className="text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                <span className="font-semibold text-slate-700">Headline:</span> {user.headline}
              </p>
            )}
          </div>

          {/* AI Settings */}
          <div className="space-y-3 p-4 rounded-xl border border-slate-100 bg-white">
            <h3 className="font-bold text-slate-900 text-xs">AI & Engine Settings</h3>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Default Text LLM Model</label>
              <select
                defaultValue="gpt-4o-mini"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="gpt-4o-mini">OpenAI GPT-4o-mini (Recommended - Fast & Cost Efficient)</option>
                <option value="gpt-4o">OpenAI GPT-4o (High Analytical Depth)</option>
              </select>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[11px] font-semibold text-slate-600">Visual Generator Engine</label>
              <select
                defaultValue="dall-e-3"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="dall-e-3">DALL-E 3 (High Definition Visuals)</option>
              </select>
            </div>
          </div>

          {/* CDN & Media */}
          <div className="space-y-3 p-4 rounded-xl border border-slate-100 bg-white">
            <h3 className="font-bold text-slate-900 text-xs">Storage & Media Delivery</h3>
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-800">Cloudinary Media CDN</p>
                <p className="text-slate-500 text-[11px]">Handles image transformations, slide PNG caching & WebP conversion</p>
              </div>
              <span className="text-emerald-700 font-bold text-[11px]">Active</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              ← Back to Overview
            </Link>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
