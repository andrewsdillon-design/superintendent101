'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [loadingFeed, setLoadingFeed] = useState(true)

  useEffect(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || [])
        setLoadingFeed(false)
      })
      .catch(() => setLoadingFeed(false))
  }, [])

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

  const userName = (session?.user as any)?.name || (session?.user as any)?.username || 'You'

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">S101</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-white">Feed</Link>
              <Link href="/mentors" className="text-gray-400 hover:text-white">Mentors</Link>
              <Link href="/projects" className="text-gray-400 hover:text-white">Projects</Link>
              <Link href="/dust-logs" className="text-gray-400 hover:text-white">Dust Logs</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="text-sm text-gray-400 hover:text-white">
              {userName}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm text-gray-400 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <h1 className="font-display text-2xl font-bold text-safety-yellow">FEED</h1>

            {/* Post composer */}
            <div className="card">
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full bg-blueprint-bg border border-blueprint-grid p-3 text-white min-h-[100px] focus:outline-none focus:border-neon-cyan resize-none"
                placeholder="Share something with the community..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.ctrlKey) handlePost()
                }}
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

            {/* Posts feed */}
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

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-bold text-safety-blue mb-4">QUICK ACTIONS</h3>
              <div className="space-y-2">
                <Link href="/dust-logs/new" className="btn-primary w-full text-sm block text-center">New Dust Log</Link>
                <Link href="/mentors" className="btn-secondary w-full text-sm block text-center">Find a Mentor</Link>
                <Link href="/projects" className="btn-secondary w-full text-sm block text-center">My Projects</Link>
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-safety-orange mb-4">TRENDING TAGS</h3>
              <div className="flex flex-wrap gap-2">
                <span className="tag">safety</span>
                <span className="tag">concrete</span>
                <span className="tag">steel</span>
                <span className="tag">scheduling</span>
                <span className="tag">rfi</span>
                <span className="tag">lessons-learned</span>
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-safety-green mb-4">FEATURED MENTORS</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blueprint-paper rounded-full flex items-center justify-center text-xs">MS</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Mike Smith</p>
                    <p className="text-xs text-gray-500">Safety • Scheduling</p>
                  </div>
                  <span className="text-xs text-neon-cyan">$75/hr</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blueprint-paper rounded-full flex items-center justify-center text-xs">RJ</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Rachel Johnson</p>
                    <p className="text-xs text-gray-500">Concrete • Steel</p>
                  </div>
                  <span className="text-xs text-neon-cyan">$90/hr</span>
                </div>
              </div>
              <Link href="/mentors" className="block mt-4 text-xs text-neon-cyan hover:underline text-center">
                View all mentors →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
