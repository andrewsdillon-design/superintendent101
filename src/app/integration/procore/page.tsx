import Link from 'next/link'

export const metadata = {
  title: 'Procore Integration — ProFieldHub',
  description: 'How to connect ProFieldHub to Procore and automatically sync your daily field logs.',
}

export default function ProcoreIntegrationPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0d1117]/90 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-[#00e5ff]">ProFieldHub</Link>
          <Link
            href="/login"
            className="text-sm bg-[#00e5ff] text-black font-bold px-4 py-2 rounded hover:bg-[#00c8e0] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">

        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#ff6b35] rounded-lg flex items-center justify-center font-bold text-xl">P</div>
            <span className="text-white/40 text-2xl">+</span>
            <div className="w-12 h-12 bg-[#00e5ff]/10 border border-[#00e5ff]/30 rounded-lg flex items-center justify-center font-bold text-xl text-[#00e5ff]">F</div>
          </div>
          <h1 className="text-3xl font-bold mb-3">ProFieldHub + Procore Integration</h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Automatically push your daily field logs from ProFieldHub into Procore — work performed, crew counts, deliveries, inspections, and more. No double entry.
          </p>
        </div>

        {/* What syncs */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#00e5ff] mb-4">What Gets Synced to Procore</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: 'Work Performed', desc: 'Pushed to Procore Work Logs' },
              { label: 'Crew Counts', desc: 'One manpower log entry per trade' },
              { label: 'Deliveries', desc: 'Pushed to Procore Delivery Logs' },
              { label: 'Inspections', desc: 'Pushed to Procore Notes Logs' },
              { label: 'Issues & Delays', desc: 'Pushed to Procore Notes Logs' },
              { label: 'Safety Notes', desc: 'Pushed to Procore Notes Logs' },
              { label: 'RFIs', desc: 'Pushed to Procore Notes Logs' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
                <span className="text-[#00e5ff] font-bold mt-0.5">✓</span>
                <div>
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-white/40 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Step by step */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#00e5ff] mb-6">How to Connect</h2>
          <div className="space-y-6">

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#00e5ff] text-black font-bold text-sm flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <h3 className="font-bold mb-1">Sign in to ProFieldHub</h3>
                <p className="text-white/60 text-sm">
                  Log in to your account at{' '}
                  <Link href="/login" className="text-[#00e5ff] underline">profieldhub.com/login</Link>.
                  You need an active ProFieldHub subscription to use the Procore integration.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#00e5ff] text-black font-bold text-sm flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <h3 className="font-bold mb-1">Go to Profile Settings</h3>
                <p className="text-white/60 text-sm">
                  Navigate to{' '}
                  <Link href="/profile" className="text-[#00e5ff] underline">profieldhub.com/profile</Link>{' '}
                  and scroll down to the <strong className="text-white">Procore Integration</strong> section.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#00e5ff] text-black font-bold text-sm flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <h3 className="font-bold mb-1">Click "Connect Procore"</h3>
                <p className="text-white/60 text-sm">
                  You'll be redirected to Procore's authorization page. Sign in with your Procore credentials and click <strong className="text-white">Allow</strong> to grant ProFieldHub access to your projects and daily logs.
                </p>
                <div className="mt-3 bg-white/5 border border-white/10 rounded p-3 text-xs text-white/50">
                  ProFieldHub only requests access to read your project list and write daily log entries. We do not access financials, contracts, or any other Procore data.
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#00e5ff] text-black font-bold text-sm flex items-center justify-center flex-shrink-0">4</div>
              <div>
                <h3 className="font-bold mb-1">Link Your Projects</h3>
                <p className="text-white/60 text-sm">
                  After connecting, a project linking section will appear. For each ProFieldHub project, select the matching Procore project from the dropdown. This tells the system where to push each log.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#00e5ff] text-black font-bold text-sm flex items-center justify-center flex-shrink-0">5</div>
              <div>
                <h3 className="font-bold mb-1">You're Done — Logs Push Automatically</h3>
                <p className="text-white/60 text-sm">
                  Every time you save a daily log in ProFieldHub, the data is automatically pushed to the corresponding Procore project. You can also manually push any past log from the log history page.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Requirements */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#00e5ff] mb-4">Requirements</h2>
          <ul className="space-y-2 text-sm text-white/60">
            {[
              'An active ProFieldHub account (Pro plan)',
              'An active Procore account with access to at least one project',
              'Daily Logs tool enabled in your Procore project(s)',
              'Your Procore user role must have permission to create daily log entries',
            ].map(req => (
              <li key={req} className="flex items-start gap-2">
                <span className="text-[#ff6b35] mt-0.5">•</span>
                {req}
              </li>
            ))}
          </ul>
        </section>

        {/* Troubleshooting */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#00e5ff] mb-4">Troubleshooting</h2>
          <div className="space-y-4">
            {[
              {
                q: 'My logs aren\'t appearing in Procore.',
                a: 'Make sure your ProFieldHub project is linked to a Procore project in Profile settings. Also confirm the Daily Logs tool is enabled in your Procore project configuration.',
              },
              {
                q: 'I see a "project not linked" error.',
                a: 'Go to Profile → Procore Integration and use the dropdown to link your project to the correct Procore project.',
              },
              {
                q: 'The connection expired.',
                a: 'Procore access tokens expire periodically. Simply click "Connect Procore" again in your profile to re-authorize.',
              },
              {
                q: 'I need to disconnect ProFieldHub from Procore.',
                a: 'In Profile → Procore Integration, click "Disconnect." This removes all stored tokens and project links. You can reconnect at any time.',
              },
            ].map(item => (
              <div key={item.q} className="border border-white/10 rounded-lg p-4">
                <p className="font-semibold text-sm mb-1">{item.q}</p>
                <p className="text-white/50 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Support */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
          <p className="font-bold mb-1">Need help?</p>
          <p className="text-white/50 text-sm mb-4">Contact our support team and we'll get you set up.</p>
          <a
            href="mailto:dillon@profieldhub.com"
            className="inline-block bg-[#00e5ff] text-black font-bold px-6 py-2 rounded hover:bg-[#00c8e0] transition-colors text-sm"
          >
            Email Support
          </a>
        </div>

      </main>

      <footer className="border-t border-white/10 mt-16 py-8 text-center text-white/30 text-xs">
        © {new Date().getFullYear()} ProFieldHub · <Link href="/privacy" className="hover:text-white">Privacy Policy</Link> · <Link href="/terms" className="hover:text-white">Terms</Link>
      </footer>
    </div>
  )
}
