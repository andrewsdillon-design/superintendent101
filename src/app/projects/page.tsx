import Link from 'next/link'
import MobileNav from '@/components/MobileNav'

const projects = [
  { id: '1', name: 'Target Store #2847', address: '1234 Main St, Columbus, OH', type: 'Retail', sqft: 45000, status: 'ACTIVE' },
  { id: '2', name: 'Walmart DC', address: '5678 Industrial Blvd, Phoenix, AZ', type: 'Industrial', sqft: 250000, status: 'COMPLETED' },
  { id: '3', name: 'Apartment Complex Phase 2', address: '900 Oak Ave, Austin, TX', type: 'Multi-Family', sqft: 120000, status: 'ACTIVE' },
]

export default function ProjectsPage() {
  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400">Feed</Link>
              <Link href="/mentors" className="text-gray-400">Mentors</Link>
              <Link href="/projects" className="text-white font-semibold">Projects</Link>
              <Link href="/dust-logs" className="text-gray-400">Dust Logs</Link>
            </nav>
          </div>
          <Link href="/profile" className="text-sm text-gray-400">Profile</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-safety-yellow">PROJECTS</h1>
            <p className="text-gray-400 mt-2">Document your project history. Get found.</p>
          </div>
          <button className="btn-primary">+ Add Project</button>
        </div>

        <div className="card mb-6 grid md:grid-cols-4 gap-4">
          <input type="text" className="bg-blueprint-bg border border-blueprint-grid p-2 text-white" placeholder="Search projects..." />
          <select className="bg-blueprint-bg border border-blueprint-grid p-2 text-white">
            <option>All Types</option>
            <option>Retail</option>
            <option>Industrial</option>
            <option>Multi-Family</option>
          </select>
          <select className="bg-blueprint-bg border border-blueprint-grid p-2 text-white">
            <option>All Status</option>
            <option>Active</option>
            <option>Completed</option>
          </select>
          <select className="bg-blueprint-bg border border-blueprint-grid p-2 text-white">
            <option>Sort: Recent</option>
            <option>Sort: Name</option>
            <option>Sort: Size</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="card">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{project.name}</h3>
                <span className={project.status === 'ACTIVE' ? 'badge-safe' : 'text-xs text-gray-400'}>{project.status}</span>
              </div>
              <p className="text-sm text-gray-500">{project.address}</p>
              <div className="mt-4 flex gap-4 text-sm text-gray-400">
                <span>{project.type}</span>
                <span>{project.sqft.toLocaleString()} sqft</span>
              </div>
              <div className="mt-4 pt-4 border-t border-blueprint-grid flex justify-between">
                <button className="btn-secondary text-sm">View Details</button>
                <button className="text-sm text-gray-400 hover:text-white">Edit</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 card">
          <h3 className="font-bold text-safety-blue mb-4">PROJECT STATS</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-neon-cyan">12</p>
              <p className="text-xs text-gray-400">Total Projects</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-safety-green">2</p>
              <p className="text-xs text-gray-400">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-safety-yellow">10</p>
              <p className="text-xs text-gray-400">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">1.2M</p>
              <p className="text-xs text-gray-400">Total sqft</p>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
