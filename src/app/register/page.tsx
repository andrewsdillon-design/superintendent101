import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl font-bold text-neon-cyan">
            SUPERINTENDENT101
          </Link>
          <p className="text-gray-400 mt-2">Field Staff. Connected.</p>
        </div>

        <div className="card">
          <h2 className="font-display text-xl font-bold mb-6 text-center">Create Account</h2>
          
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase">First Name</label>
                <input type="text" className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1" placeholder="John" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase">Last Name</label>
                <input type="text" className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1" placeholder="Smith" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase">Email</label>
              <input type="email" className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1" placeholder="you@company.com" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase">Username</label>
              <input type="text" className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1" placeholder="johnsmith" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase">Password</label>
              <input type="password" className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase">Skills (comma separated)</label>
              <input type="text" className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1" placeholder="superintendent, project-manager, concrete" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase">Years of Experience</label>
              <input type="number" className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1" placeholder="10" />
            </div>
            <button type="submit" className="btn-primary w-full">Create Account</button>
          </form>

          <div className="mt-6 text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-neon-cyan hover:underline">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
