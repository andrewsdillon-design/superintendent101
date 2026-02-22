import Link from 'next/link'

const mentors = [
  { id: '1', name: 'Mike Smith', username: 'mikesmith', bio: '25 years in commercial construction. OSHA 500 certified.', skills: ['superintendent', 'safety', 'scheduling'], hourlyRate: 75, location: 'Columbus, OH' },
  { id: '2', name: 'Rachel Johnson', username: 'racheljohnson', bio: 'Former Army Corps. Expert in concrete and steel.', skills: ['concrete', 'steel', 'structural'], hourlyRate: 90, location: 'Austin, TX' },
  { id: '3', name: 'David Chen', username: 'davidchen', bio: 'Data center specialist. Lean construction advocate.', skills: ['data-centers', 'lean'], hourlyRate: 85, location: 'Phoenix, AZ' },
  { id: '4', name: 'Sarah Williams', username: 'sarahwilliams', bio: 'Multi-family expert. Passionate about mentoring.', skills: ['multi-family', 'quality-control'], hourlyRate: 80, location: 'Denver, CO' },
]

export default function MentorsPage() {
  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">S101</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400">Feed</Link>
              <Link href="/mentors" className="text-white font-semibold">Mentors</Link>
              <Link href="/projects" className="text-gray-400">Projects</Link>
              <Link href="/dust-logs" className="text-gray-400">Dust Logs</Link>
            </nav>
          </div>
          <Link href="/profile" className="text-sm text-gray-400">Profile</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-safety-green">MENTORS</h1>
          <p className="text-gray-400 mt-2">Book 1-on-1 sessions. Pay in USDC. No corporate fluff.</p>
        </div>

        <div className="card mb-6 grid md:grid-cols-4 gap-4">
          <input type="text" className="bg-blueprint-bg border border-blueprint-grid p-2 text-white" placeholder="Search..." />
          <select className="bg-blueprint-bg border border-blueprint-grid p-2 text-white">
            <option>All Locations</option>
            <option>Ohio</option>
            <option>Texas</option>
            <option>Arizona</option>
          </select>
          <select className="bg-blueprint-bg border border-blueprint-grid p-2 text-white">
            <option>All Skills</option>
            <option>Safety</option>
            <option>Concrete</option>
            <option>Steel</option>
          </select>
          <select className="bg-blueprint-bg border border-blueprint-grid p-2 text-white">
            <option>Any Rate</option>
            <option>$0-$50/hr</option>
            <option>$50-$100/hr</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="card">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-blueprint-paper rounded-full flex items-center justify-center text-xl font-bold text-safety-green">
                  {mentor.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{mentor.name}</h3>
                    <span className="badge-safe">MENTOR</span>
                  </div>
                  <p className="text-sm text-gray-500">@{mentor.username} • {mentor.location}</p>
                  <p className="text-sm text-gray-300 mt-2">{mentor.bio}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {mentor.skills.map(s => <span key={s} className="tag">{s}</span>)}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blueprint-grid flex justify-between items-center">
                <span className="text-neon-cyan font-semibold">${mentor.hourlyRate}/hr</span>
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm">View</button>
                  <button className="btn-primary text-sm">Book</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
