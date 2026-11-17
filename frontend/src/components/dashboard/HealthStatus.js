'use client';

import { useState, useEffect } from 'react';
import { healthApi } from '@/services/api';

export default function HealthStatus() {
  const [status, setStatus] = useState({
    loading: true,
    online: false,
    systems: null,
    error: null,
    lastChecked: null
  });

  const checkHealth = async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await healthApi.checkReadiness();
      setStatus({
        loading: false,
        online: true,
        systems: response.data.systems,
        error: null,
        lastChecked: new Date().toLocaleTimeString()
      });
    } catch (err) {
      setStatus({
        loading: false,
        online: false,
        systems: null,
        error: err.message || 'Failed to connect to backend',
        lastChecked: new Date().toLocaleTimeString()
      });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Backend Subsystems & Architecture Health</h2>
          <p className="text-sm text-gray-500">Live communication test between Next.js client and Express.js API</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              status.online ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${status.online ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}
            ></span>
            {status.online ? 'API Online' : 'Connecting / Offline'}
          </span>
          <button
            onClick={checkHealth}
            disabled={status.loading}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {status.loading ? 'Pinging...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        {/* MongoDB Card */}
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Database</div>
          <div className="text-sm font-bold text-gray-800">MongoDB / Mongoose</div>
          <div className="text-xs mt-2 text-gray-600">
            Status:{' '}
            <span className="font-medium text-gray-900">
              {status.systems?.database?.status || 'Ready for Connection'}
            </span>
          </div>
        </div>

        {/* Redis & BullMQ Card */}
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Queue & Cache</div>
          <div className="text-sm font-bold text-gray-800">Redis & BullMQ</div>
          <div className="text-xs mt-2 text-gray-600">
            Status:{' '}
            <span className="font-medium text-gray-900">
              {status.systems?.redis?.status || 'Ready for Connection'}
            </span>
          </div>
        </div>

        {/* OpenAI Engine Card */}
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">AI Engine</div>
          <div className="text-sm font-bold text-gray-800">OpenAI API</div>
          <div className="text-xs mt-2 text-gray-600">
            Model: <span className="font-medium text-gray-900">{status.systems?.aiService?.textModel || 'gpt-4o-mini'}</span>
          </div>
        </div>

        {/* Cloudinary Storage Card */}
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Media CDN</div>
          <div className="text-sm font-bold text-gray-800">Cloudinary</div>
          <div className="text-xs mt-2 text-gray-600">
            Cloud:{' '}
            <span className="font-medium text-gray-900">
              {status.systems?.cloudinary?.cloudName || 'Configured'}
            </span>
          </div>
        </div>
      </div>

      {status.lastChecked && (
        <div className="text-right text-[11px] text-gray-400 mt-3">
          Last verified: {status.lastChecked}
        </div>
      )}
    </div>
  );
}

