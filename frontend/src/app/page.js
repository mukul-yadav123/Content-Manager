import Navbar from '@/components/layout/Navbar';
import HealthStatus from '@/components/dashboard/HealthStatus';

export default function Home() {
  const architecturalPillars = [
    {
      title: 'Industry News Discovery',
      desc: 'Automated research pipeline with OpenAI web_search to ingest trends and verified statistics.',
      icon: '🌐',
      badge: 'Step 1'
    },
    {
      title: 'Viral Post Generation',
      desc: 'Modular prompt engineering generating high-retention hooks, scannable bodies, and strong CTAs.',
      icon: '✍️',
      badge: 'Step 2'
    },
    {
      title: 'Writing Profile Humanizer',
      desc: 'Voice adaptation engine matching personal cadence, sentence variance, and banned buzzwords.',
      icon: '🎭',
      badge: 'Step 3'
    },
    {
      title: 'Media & Carousel Studio',
      desc: 'OpenAI Image API header graphics and multi-slide carousel generator backed by Cloudinary CDN.',
      icon: '🎨',
      badge: 'Step 4'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-8 sm:p-10 text-white shadow-lg">
          <div className="max-w-3xl space-y-4">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold tracking-wide uppercase">
              Phase 1 Architecture Initialized
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              AI-Powered LinkedIn Content Studio
            </h1>
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed">
              Monorepo architecture with Next.js App Router frontend, modular Express.js backend,
              isolated AI prompts, multi-user MongoDB schemas, BullMQ queue handling, and Cloudinary storage.
            </p>
          </div>
        </div>

        {/* Live Subsystem Health Status Component */}
        <HealthStatus />

        {/* Studio Pipeline Architectural Modules */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Content Studio Pipeline Modules</h2>
            <p className="text-sm text-gray-500">
              Architecture blueprints and decoupled service boundaries for subsequent feature iterations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {architecturalPillars.map((pillar, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-2xl">{pillar.icon}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {pillar.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{pillar.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{pillar.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 text-xs font-medium text-blue-600 flex items-center justify-between">
                  <span>Architecture Ready</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture Checklist & Technical Specs */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-3">Architecture Verification Checklist</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-gray-700">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-900 font-medium border border-green-200">
              <span>✓</span> Monorepo Layout (client / server)
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-900 font-medium border border-green-200">
              <span>✓</span> Next.js App Router (JavaScript)
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-900 font-medium border border-green-200">
              <span>✓</span> Express.js (Native ES Modules)
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-900 font-medium border border-green-200">
              <span>✓</span> Zod Environment Validation
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-900 font-medium border border-green-200">
              <span>✓</span> Centralized Error Handling & Winston
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-900 font-medium border border-green-200">
              <span>✓</span> Isolated AI Prompts (prompts/*)
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-900 font-medium border border-green-200">
              <span>✓</span> Multi-User Mongoose Models
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-900 font-medium border border-green-200">
              <span>✓</span> Redis & BullMQ Queue Foundation
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 text-green-900 font-medium border border-green-200">
              <span>✓</span> Cloudinary Media Storage Module
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        AI-Powered LinkedIn Content Studio &bull; Monorepo Architecture Blueprint
      </footer>
    </div>
  );
}
