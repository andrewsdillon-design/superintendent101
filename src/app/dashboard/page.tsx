'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import MobileNav from '@/components/mobile-nav'
import type { MentorForMap } from '@/components/mentor-map'

// Lazy load the map (client-only, contains d3 projections)
const MentorMap = dynamic(() => import('@/components/mentor-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 flex items-center justify-center border border-blueprint-grid text-gray-400 text-sm">
      Loading map...
    </div>
  ),
})

interface Post {
  id: string
  author: { name: string; username: string; role?: string }
  content: string
  tags: string[]
  type: string
  createdAt: string
  likes: number
  comments: number
}

const ALL_TAGS = [
  'safety', 'concrete', 'steel', 'scheduling', 'rfi', 'submittal',
  'osha', 'superintendents', 'superintendent', 'lean', 'quality-control',
  'inspection', 'healthcare', 'data-centers', 'multi-family', 'retail',
  'industrial', 'structural', 'pm', 'welding', 'compliance',
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const userName = user?.name || user?.username || 'You'
  const role = user?.role

  const [tab, setTab] = useState<'map' | 'feed'>('map')
  const [mentors, setMentors] = useState<MentorForMap[]>([])
  const [mentorTags, setMentorTags] = useState<string[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [loadingFeed, setLoadingFeed] = useState(false)
  const [loadingMentors, setLoadingMentors] = useState(true)

  // Load mentors for map
  useEffect(() => {
    fetch('/api/mentors')
      .then(r => r.json())
      .then(data => {
        const ms: MentorForMap[] = data.mentors ?? []
        setMentors(ms)
        // Collect all unique tags across mentors
        const tags = new Set<string>()
        ms.forEach(m => m.skills.forEach(s => tags.add(s)))
        setMentorTags(Array.from(tags).sort())
        setLoadingMentors(false)
      })
      .catch(() => setLoadingMentors(false))
  }, [])

  const loadFeed = useCallback(() => {
    setLoadingFeed(true)
    fetch('/api/posts')
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || [])
        setLoadingFeed(false)
      })
      .catch(() => setLoadingFeed(false))
  }, [])

  useEffect(() => {
    if (tab === 'feed' && posts.length === 0) loadFeed()
  }, [tab, posts.length, loadFeed])

  async function handlePost() {
    if (!content.trim() || posting) return
    setPosting(true)
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    const data = await res.json()
    if (data.post) {
      setPosts(prev => [data.post, ...prev])
      setContent('')
    }
    setPosting(false)
  }

  // Tags to display in the filter — prefer actual mentor tags, fall back to ALL_TAGS
  const displayTags = mentorTags.length > 0 ? mentorTags : ALL_TAGS

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-white">Home</Link>
              <Link href="/mentors" className="text-gray-400 hover:text-white">Mentors</Link>
              <Link href="/projects" className="text-gray-400 hover:text-white">Projects</Link>
              <Link href="/dust-logs" className="text-gray-400 hover:text-white">Daily Logs</Link>
              <Link href="/wallet" className="text-gray-400 hover:text-white">Wallet</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {role === 'ADMIN' && (
              <Link href="/admin" className="text-xs text-safety-orange hover:underline hidden sm:block">Admin</Link>
            )}
            <Link href="/profile" className="text-sm text-gray-400 hover:text-white hidden sm:block">{userName}</Link>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-400 hover:text-white">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8">
        {/* Tab switcher */}
        <div className="flex gap-0 mb-6 border-b border-blueprint-grid">
          <button
            onClick={() => setTab('map')}
            className={`px-6 py-3 text-sm font-bold tracking-wide border-b-2 transition-colors ${
              tab === 'map'
                ? 'border-neon-cyan text-neon-cyan'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            MENTOR MAP
          </button>
          <button
            onClick={() => setTab('feed')}
            className={`px-6 py-3 text-sm font-bold tracking-wide border-b-2 transition-colors ${
              tab === 'feed'
                ? 'border-safety-yellow text-safety-yellow'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            COMMUNITY FEED
          </button>
        </div>

        {/* MAP TAB */}
        {tab === 'map' && (
          <div>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Tag filter sidebar */}
              <div className="lg:w-52 shrink-0">
                <div className="card">
                  <h3 className="font-bold text-safety-orange text-xs mb-3 tracking-widest">FILTER BY TAG</h3>
                  <div className="flex flex-wrap lg:flex-col gap-1.5 max-h-48 lg:max-h-none overflow-y-auto">
                    <button
                      onClick={() => setActiveTag(null)}
                      className={`text-left text-xs px-2 py-1 border transition-colors ${
                        activeTag === null
                          ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10'
                          : 'border-blueprint-grid text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      All Mentors
                      <span className="ml-1 text-gray-500">({mentors.length})</span>
                    </button>
                    {displayTags.map(tag => {
                      const count = mentors.filter(m => m.skills.includes(tag)).length
                      if (count === 0) return null
                      return (
                        <button
                          key={tag}
                          onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                          className={`text-left text-xs px-2 py-1 border transition-colors ${
                            activeTag === tag
                              ? 'border-safety-yellow text-safety-yellow bg-safety-yellow/10'
                              : 'border-blueprint-grid text-gray-400 hover:border-gray-400'
                          }`}
                        >
                          {tag}
                          <span className="ml-1 text-gray-500">({count})</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="card mt-4">
                  <h3 className="font-bold text-safety-blue text-xs mb-3 tracking-widest">QUICK LINKS</h3>
                  <div className="space-y-2">
                    <Link href="/dust-logs/new" className="btn-primary w-full text-xs block text-center py-2">New Dust Log</Link>
                    <Link href="/projects" className="btn-secondary w-full text-xs block text-center py-2">My Projects</Link>
                    <Link href="/wallet" className="btn-secondary w-full text-xs block text-center py-2">USDC Wallet</Link>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="flex-1">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold text-safety-green">
                      MENTOR COMMUNITY
                      {activeTag && <span className="text-safety-yellow ml-2 text-base">— {activeTag}</span>}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {loadingMentors
                        ? 'Loading...'
                        : `${activeTag ? mentors.filter(m => m.skills.includes(activeTag)).length : mentors.length} mentor${mentors.length !== 1 ? 's' : ''} · Click a pin to view`}
                    </p>
                  </div>
                  <Link href="/mentors" className="text-xs text-neon-cyan hover:underline">
                    Browse all →
                  </Link>
                </div>

                {loadingMentors ? (
                  <div className="h-64 flex items-center justify-center border border-blueprint-grid text-gray-400 text-sm">
                    Loading mentors...
                  </div>
                ) : (
                  <MentorMap mentors={mentors} activeTag={activeTag} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* FEED TAB */}
        {tab === 'feed' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Post composer */}
              <div className="card">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full bg-blueprint-bg border border-blueprint-grid p-3 text-white min-h-[100px] focus:outline-none focus:border-neon-cyan resize-none"
                  placeholder="Share something with the community..."
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handlePost() }}
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Ctrl+Enter to post</span>
                  <button
                    onClick={handlePost}
                    disabled={posting || !content.trim()}
                    className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>

              {loadingFeed ? (
                <div className="card text-center text-gray-400 py-8">Loading feed...</div>
              ) : posts.length === 0 ? (
                <div className="card text-center text-gray-400 py-8">No posts yet. Be the first to share!</div>
              ) : (
                posts.map(post => (
                  <div key={post.id} className="card">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-blueprint-paper rounded-full flex items-center justify-center text-neon-cyan font-bold text-sm flex-shrink-0">
                        {initials(post.author.name || post.author.username)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{post.author.name || post.author.username}</span>
                          {post.author.role === 'MENTOR' && <span className="badge-safe text-xs">MENTOR</span>}
                          <span className="text-xs text-gray-500">• {timeAgo(post.createdAt)}</span>
                          {post.type !== 'DISCUSSION' && (
                            <span className="text-xs text-safety-orange uppercase">{post.type.replace('_', ' ')}</span>
                          )}
                        </div>
                        <p className="mt-2 text-gray-300 text-sm whitespace-pre-wrap">{post.content}</p>
                        {post.tags.length > 0 && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {post.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                          </div>
                        )}
                        <div className="mt-3 flex gap-4 text-xs text-gray-500">
                          <span>{post.likes} likes</span>
                          <span>{post.comments} comments</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-6">
              <div className="card">
                <h3 className="font-bold text-safety-orange mb-4">TRENDING TAGS</h3>
                <div className="flex flex-wrap gap-2">
                  {['safety', 'concrete', 'steel', 'scheduling', 'rfi', 'lessons-learned'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => { setTab('map'); setActiveTag(tag) }}
                      className="tag hover:border-safety-yellow hover:text-safety-yellow transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-bold text-safety-green mb-3">FIND MENTORS</h3>
                <p className="text-xs text-gray-400 mb-3">Browse the mentor map to find field experts near you.</p>
                <button onClick={() => setTab('map')} className="btn-primary w-full text-sm">
                  Open Mentor Map
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
