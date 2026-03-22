import Link from 'next/link';

export default function BannedPage() {
  return (
    <div className="min-h-screen bg-[#05050A] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-8">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-white mb-4">Account Suspended</h1>
        <p className="text-gray-400 text-base mb-8 leading-relaxed">
          Your access to this platform has been suspended by the administrator. 
          If you believe this is a mistake, please contact your instructor to resolve this issue.
        </p>
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-sm text-red-300/80">
          Reference your registered email when contacting support.
        </div>
        <Link href="/api/auth/signout" className="inline-block mt-8 text-sm text-gray-500 hover:text-white transition">
          Sign out →
        </Link>
      </div>
    </div>
  );
}
