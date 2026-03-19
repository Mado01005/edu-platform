import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center fade-in">
        <div className="text-8xl mb-6">🔍</div>
        <h1 className="text-5xl font-bold text-white mb-3">404</h1>
        <p className="text-gray-400 text-lg mb-8">This page doesn&apos;t exist.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl hover:-translate-y-0.5 transition-transform shadow-lg shadow-indigo-500/25"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
}
