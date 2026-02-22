import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl font-bold text-neon-cyan">
            SUPERINTENDENT101
          </Link>
          <p className="text-gray-400 mt-2">Field Staff. Connected.</p>
        </div>

        <div className="card">
          <h2 className="font-display text-xl font-bold mb-6 text-center">Sign In</h2>
          
          <form className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase">Email</label>
              <input type="email" className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1" placeholder="you@company.com" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase">Password</label>
              <input type="password" className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1" placeholder="••••••••" />
            </div>
            <button type="submit" className="btn-primary w-full">Sign In</button>
          </form>

          <div className="mt-6 text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link href="/register" className="text-neon-cyan hover:underline">Join Now</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
