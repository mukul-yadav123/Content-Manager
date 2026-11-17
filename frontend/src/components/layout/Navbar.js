'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & App Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-[#0077b5] flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-[#005582] transition-colors">
              in
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">Content Studio</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                AI Powered
              </span>
            </div>
          </Link>

          {/* Navigation & Auth Actions */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-8 w-24 bg-gray-100 rounded-md animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center gap-3">
                {/* User info */}
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold text-gray-900 leading-tight">{user.name}</span>
                  <span className="text-[11px] text-gray-500 truncate max-w-[180px]">
                    {user.headline || user.email}
                  </span>
                </div>

                {/* Avatar / Initials */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-red-700 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 text-sm font-medium text-white bg-[#0077b5] hover:bg-[#005582] rounded-lg shadow-xs transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
