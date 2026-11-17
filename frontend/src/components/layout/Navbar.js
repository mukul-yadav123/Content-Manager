'use client';

export default function Navbar() {
  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              in
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">LinkedIn Content Studio</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                AI Architect v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <span className="hidden sm:inline-block px-3 py-1 rounded-md bg-gray-100 text-gray-700">
              Architecture Phase 1
            </span>
            <a
              href="http://localhost:5000/api/health/ready"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-xs"
            >
              API Status
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

