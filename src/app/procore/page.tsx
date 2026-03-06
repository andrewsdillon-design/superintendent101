'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MobileNav from '@/components/mobile-nav'

interface ProcoreProject {
  id: number
  name: string
  address?: string
  status?: string
}

interface LocalProject {
  id: string
  title: string
}

interface LinkMap {
  [procoreProjectId: number]: { localProjectId: string; localTitle: string }
}

interface ProcoreDoc {
  id: number
  name: string
  document_type: 'folder' | 'file'
  url?: string
  updated_at?: string
  created_at?: string
}

interface ProcoreComment {
  id: number
  body: string
  created_at: string
  author?: { name: string }
}

export default function ProcorePage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const role = user?.role
  const router = useRouter()

  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const [companies, setCompanies] = useState<any[]>([])
  const [companyId, setCompanyId] = useState<number | null>(null)
  const [loadingCompanies, setLoadingCompanies] = useState(false)

  const [procoreProjects, setProcoreProjects] = useState<ProcoreProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const [localProjects, setLocalProjects] = useState<LocalProject[]>([])
  const [linkMap, setLinkMap] = useState<LinkMap>({})

  const [importingId, setImportingId] = useState<number | null>(null)
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [syncResults, setSyncResults] = useState<Record<number, string>>({})

  // Documents browser
  const [docsProject, setDocsProject] = useState<{ procoreId: number; localId: string; name: string } | null>(null)
  const [docs, setDocs] = useState<ProcoreDoc[]>([])
  const [folderStack, setFolderStack] = useState<{ id: number | null; name: string }[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [docsError, setDocsError] = useState('')

  // Comments
  const [commentDoc, setCommentDoc] = useState<ProcoreDoc | null>(null)
  const [comments, setComments] = useState<ProcoreComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  // Load connection status + local projects + links
  useEffect(() => {
    Promise.all([
      fetch('/api/integrations/procore').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/integrations/procore/link').then(r => r.json()),
    ]).then(([status, projects, links]) => {
      if (!status.connected) { router.replace('/profile'); return }
      setConnected(true)
      setLocalProjects(projects.projects ?? [])
      if (links.links) {
        const map: LinkMap = {}
        links.links.forEach((l: any) => {
          map[l.procoreProjectId] = { localProjectId: l.projectId, localTitle: '' }
        })
        setLinkMap(map)
      }
      if (status.connected) loadCompanies()
    }).catch(() => {}).finally(() => setLoadingStatus(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Enrich linkMap with local project titles once localProjects loads
  useEffect(() => {
    if (localProjects.length === 0) return
    setLinkMap(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(k => {
        const entry = updated[Number(k)]
        const local = localProjects.find(p => p.id === entry.localProjectId)
        if (local) updated[Number(k)] = { ...entry, localTitle: local.title }
      })
      return updated
    })
  }, [localProjects])

  async function loadCompanies() {
    setLoadingCompanies(true)
    try {
      const d = await fetch('/api/integrations/procore/companies').then(r => r.json())
      const cos = d.companies ?? []
      setCompanies(cos)
      if (cos.length >= 1) setCompanyId(cos[0].id)
    } catch {}
    setLoadingCompanies(false)
  }

  useEffect(() => {
    if (!companyId) return
    setLoadingProjects(true)
    setProcoreProjects([])
    fetch(`/api/integrations/procore/projects?companyId=${companyId}`)
      .then(r => r.json())
      .then(d => setProcoreProjects(d.projects ?? []))
      .catch(() => {})
      .finally(() => setLoadingProjects(false))
  }, [companyId])

  async function handleConnect() {
    setConnecting(true)
    try {
      const d = await fetch('/api/integrations/procore/connect').then(r => r.json())
      if (d.url) window.location.href = d.url
    } catch {}
    setConnecting(false)
  }

  async function handleImport(p: ProcoreProject) {
    setImportingId(p.id)
    try {
      const res = await fetch('/api/integrations/procore/import-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procoreProjectId: p.id, procoreCompanyId: companyId, name: p.name, address: p.address }),
      })
      const data = await res.json()
      if (res.ok && data.project) {
        if (!data.alreadyImported) setLocalProjects(prev => [data.project, ...prev])
        setLinkMap(prev => ({ ...prev, [p.id]: { localProjectId: data.project.id, localTitle: data.project.title } }))
      }
    } catch {}
    setImportingId(null)
  }

  async function handleLink(procoreProjectId: number, localProjectId: string) {
    if (!companyId) return
    const res = await fetch('/api/integrations/procore/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: localProjectId, procoreProjectId, procoreCompanyId: companyId }),
    })
    if (res.ok) {
      const local = localProjects.find(p => p.id === localProjectId)
      setLinkMap(prev => ({ ...prev, [procoreProjectId]: { localProjectId, localTitle: local?.title ?? '' } }))
    }
  }

  async function handleSync(p: ProcoreProject) {
    const linked = linkMap[p.id]
    if (!linked) return
    setSyncingId(p.id)
    setSyncResults(prev => ({ ...prev, [p.id]: '' }))
    try {
      const res = await fetch('/api/integrations/procore/sync-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: linked.localProjectId }),
      })
      const data = await res.json()
      if (res.ok) {
        const errMsg = data.errors?.length ? ` | ${data.errors[0]}` : ''
        setSyncResults(prev => ({ ...prev, [p.id]: `✓ Synced ${data.synced}/${data.total} logs${errMsg}` }))
      } else {
        setSyncResults(prev => ({ ...prev, [p.id]: data.error ?? 'Sync failed' }))
      }
    } catch {
      setSyncResults(prev => ({ ...prev, [p.id]: 'Network error' }))
    }
    setSyncingId(null)
  }

  async function openDocs(p: ProcoreProject, localId: string) {
    setDocsProject({ procoreId: p.id, localId, name: p.name })
    setFolderStack([{ id: null, name: 'Root' }])
    setDocs([])
    setDocsError('')
    loadDocs(localId, null)
  }

  async function loadDocs(localId: string, folderId: number | null) {
    setLoadingDocs(true)
    setDocsError('')
    try {
      const qs = folderId ? `&folderId=${folderId}` : ''
      const d = await fetch(`/api/integrations/procore/documents?projectId=${localId}${qs}`).then(r => r.json())
      if (d.error) { setDocsError(d.error); return }
      setDocs(d.documents ?? [])
    } catch { setDocsError('Failed to load documents') }
    setLoadingDocs(false)
  }

  function enterFolder(folder: ProcoreDoc, localId: string) {
    setFolderStack(prev => [...prev, { id: folder.id, name: folder.name }])
    setDocs([])
    loadDocs(localId, folder.id)
  }

  function goBackFolder(index: number, localId: string) {
    const newStack = folderStack.slice(0, index + 1)
    setFolderStack(newStack)
    setDocs([])
    loadDocs(localId, newStack[newStack.length - 1].id)
  }

  async function openComments(doc: ProcoreDoc, localId: string) {
    setCommentDoc(doc)
    setComments([])
    setNewComment('')
    setLoadingComments(true)
    try {
      const d = await fetch(`/api/integrations/procore/documents/comments?projectId=${localId}&docId=${doc.id}`).then(r => r.json())
      setComments(d.comments ?? [])
    } catch {}
    setLoadingComments(false)
  }

  async function postComment(localId: string) {
    if (!commentDoc || !newComment.trim()) return
    setPostingComment(true)
    try {
      const res = await fetch('/api/integrations/procore/documents/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: localId, docId: commentDoc.id, body: newComment.trim() }),
      })
      const d = await res.json()
      if (res.ok && d.comment) {
        setComments(prev => [...prev, d.comment])
        setNewComment('')
      }
    } catch {}
    setPostingComment(false)
  }

  if (loadingStatus) {
    return <div className="min-h-screen blueprint-bg flex items-center justify-center text-gray-400">Loading...</div>
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/daily-logs" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/projects" className="text-gray-400 hover:text-white">Projects</Link>
              <Link href="/daily-logs" className="text-gray-400 hover:text-white">Daily Logs</Link>
              <Link href="/procore" className="text-white font-semibold">Procore</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {role === 'ADMIN' && <Link href="/admin" className="text-xs text-safety-orange hover:underline hidden sm:block">Admin</Link>}
            <Link href="/profile" className="text-sm text-gray-400 hover:text-white hidden sm:block">Profile</Link>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-400 hover:text-white">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#ff6b35]">PROCORE</h1>
            <p className="text-gray-400 mt-1">Browse, import, and sync your Procore projects.</p>
          </div>
          <div className="flex items-center gap-3">
            {connected ? (
              <>
                <span className="text-xs text-safety-green font-bold">● CONNECTED</span>
                <Link href="/profile" className="text-xs text-gray-500 hover:text-white underline">Manage in Profile</Link>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="btn-primary disabled:opacity-50"
              >
                {connecting ? 'Connecting...' : 'Connect Procore'}
              </button>
            )}
          </div>
        </div>

        {!connected ? (
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-[#ff6b35]/10 border border-[#ff6b35]/30 rounded-lg flex items-center justify-center text-3xl font-bold text-[#ff6b35] mx-auto mb-4">P</div>
            <p className="text-white font-semibold mb-2">Connect your Procore account</p>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">Link ProFieldHub to Procore to import projects, view your project list, and auto-sync daily logs.</p>
            <button onClick={handleConnect} disabled={connecting} className="btn-primary disabled:opacity-50">
              {connecting ? 'Connecting...' : 'Connect Procore'}
            </button>
          </div>
        ) : (
          <>
            {/* Company selector */}
            {companies.length > 1 && (
              <div className="card mb-6">
                <label className="text-xs text-gray-400 uppercase font-semibold block mb-2">Company</label>
                <select
                  value={companyId ?? ''}
                  onChange={e => setCompanyId(Number(e.target.value))}
                  className="bg-blueprint-bg border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-[#ff6b35] w-full max-w-sm"
                >
                  {companies.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {loadingCompanies || loadingProjects ? (
              <div className="text-center py-16 text-gray-400">Loading Procore projects...</div>
            ) : procoreProjects.length === 0 ? (
              <div className="card text-center py-16">
                <p className="text-gray-400">No projects found in this Procore company.</p>
                <p className="text-gray-500 text-sm mt-2">Make sure your app is installed in the company and you have access to at least one project.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {procoreProjects.map(p => {
                  const linked = linkMap[p.id]
                  return (
                    <div key={p.id} className={`card flex flex-col border ${linked ? 'border-[#ff6b35]/40' : 'border-blueprint-grid'}`}>
                      {/* Procore badge */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#ff6b35] bg-[#ff6b35]/10 px-1.5 py-0.5">PROCORE</span>
                            {linked && <span className="text-xs text-safety-green font-bold">● LINKED</span>}
                          </div>
                          <h3 className="font-semibold text-base leading-tight">{p.name}</h3>
                          {p.address && <p className="text-xs text-gray-500 mt-0.5">📍 {p.address}</p>}
                          {p.status && <p className="text-xs text-gray-600 mt-0.5">{p.status}</p>}
                        </div>
                      </div>

                      {/* Linked to */}
                      {linked ? (
                        <div className="mt-2 mb-3 text-xs text-gray-400 bg-white/5 border border-white/10 px-3 py-2">
                          Linked to: <span className="text-white font-semibold">{linked.localTitle || linked.localProjectId}</span>
                        </div>
                      ) : (
                        <div className="mt-2 mb-3">
                          <label className="text-xs text-gray-500 block mb-1">Link to existing project</label>
                          <select
                            defaultValue=""
                            onChange={e => { if (e.target.value) handleLink(p.id, e.target.value) }}
                            className="w-full bg-blueprint-bg border border-blueprint-grid p-1.5 text-white text-xs focus:outline-none focus:border-[#ff6b35]"
                          >
                            <option value="">— Select ProFieldHub project —</option>
                            {localProjects.map(lp => (
                              <option key={lp.id} value={lp.id}>{lp.title}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-auto pt-3 border-t border-blueprint-grid space-y-2">
                        {!linked ? (
                          <button
                            onClick={() => handleImport(p)}
                            disabled={importingId === p.id}
                            className="w-full text-xs border border-[#ff6b35]/50 text-[#ff6b35] hover:border-[#ff6b35] px-3 py-2 transition-colors disabled:opacity-40"
                          >
                            {importingId === p.id ? 'Importing...' : '↓ Import to ProFieldHub'}
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSync(p)}
                              disabled={syncingId === p.id}
                              className="flex-1 text-xs border border-[#ff6b35]/50 text-[#ff6b35] hover:border-[#ff6b35] px-3 py-2 transition-colors disabled:opacity-40"
                            >
                              {syncingId === p.id ? 'Syncing...' : '↑ Sync Logs to Procore'}
                            </button>
                            <Link
                              href={`/daily-logs?projectId=${linked.localProjectId}`}
                              className="flex-1 text-xs border border-blueprint-grid text-gray-400 hover:border-white hover:text-white px-3 py-2 transition-colors text-center"
                            >
                              View Logs
                            </Link>
                            <button
                              onClick={() => openDocs(p, linked.localProjectId)}
                              className="flex-1 text-xs border border-blueprint-grid text-gray-400 hover:border-[#ff6b35] hover:text-[#ff6b35] px-3 py-2 transition-colors"
                            >
                              📁 Docs
                            </button>
                          </div>
                        )}
                        {syncResults[p.id] && (
                          <p className={`text-xs ${syncResults[p.id].startsWith('✓') ? 'text-safety-green' : 'text-red-400'}`}>
                            {syncResults[p.id]}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
      {/* Documents Browser Modal */}
      {docsProject && !commentDoc && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-blueprint-bg border border-blueprint-grid w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-blueprint-grid flex justify-between items-center">
              <div>
                <h2 className="font-display text-lg font-bold text-[#ff6b35]">DOCUMENTS</h2>
                <p className="text-xs text-gray-400">{docsProject.name}</p>
              </div>
              <button onClick={() => setDocsProject(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            {/* Breadcrumb */}
            <div className="px-4 py-2 border-b border-blueprint-grid flex items-center gap-1 text-xs text-gray-400 flex-wrap">
              {folderStack.map((f, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span>/</span>}
                  <button
                    onClick={() => i < folderStack.length - 1 ? goBackFolder(i, docsProject.localId) : undefined}
                    className={i < folderStack.length - 1 ? 'hover:text-white cursor-pointer' : 'text-white font-semibold'}
                  >
                    {f.name}
                  </button>
                </span>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingDocs ? (
                <p className="text-gray-400 text-sm">Loading...</p>
              ) : docsError ? (
                <p className="text-red-400 text-sm">{docsError}</p>
              ) : docs.length === 0 ? (
                <p className="text-gray-500 text-sm">No documents in this folder.</p>
              ) : (
                <div className="space-y-1">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between border border-blueprint-grid px-3 py-2 hover:border-[#ff6b35]/40 transition-colors group">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-gray-400 text-base flex-shrink-0">
                          {doc.document_type === 'folder' ? '📁' : '📄'}
                        </span>
                        <span className="text-sm text-white truncate">{doc.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {doc.document_type === 'folder' ? (
                          <button
                            onClick={() => enterFolder(doc, docsProject.localId)}
                            className="text-xs text-gray-400 hover:text-white border border-blueprint-grid px-2 py-1 hover:border-white"
                          >
                            Open →
                          </button>
                        ) : (
                          <>
                            {doc.url && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-400 hover:text-neon-cyan border border-blueprint-grid px-2 py-1 hover:border-neon-cyan"
                              >
                                View
                              </a>
                            )}
                            <button
                              onClick={() => openComments(doc, docsProject.localId)}
                              className="text-xs text-gray-400 hover:text-[#ff6b35] border border-blueprint-grid px-2 py-1 hover:border-[#ff6b35]"
                            >
                              Comments
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {commentDoc && docsProject && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-blueprint-bg border border-blueprint-grid w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-blueprint-grid flex justify-between items-center">
              <div>
                <h2 className="font-display text-base font-bold text-[#ff6b35]">COMMENTS</h2>
                <p className="text-xs text-gray-400 truncate max-w-xs">{commentDoc.name}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCommentDoc(null)} className="text-xs text-gray-400 hover:text-white border border-blueprint-grid px-2 py-1">← Back</button>
                <button onClick={() => { setCommentDoc(null); setDocsProject(null) }} className="text-gray-400 hover:text-white text-xl ml-1">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingComments ? (
                <p className="text-gray-400 text-sm">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-gray-500 text-sm">No comments yet.</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="border border-blueprint-grid p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-[#ff6b35] font-semibold">{c.author?.name ?? 'Unknown'}</span>
                      <span className="text-xs text-gray-600">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-white whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-blueprint-grid">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                rows={3}
                placeholder="Add a comment..."
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-[#ff6b35] resize-none"
              />
              <button
                onClick={() => postComment(docsProject.localId)}
                disabled={postingComment || !newComment.trim()}
                className="mt-2 btn-primary text-sm w-full disabled:opacity-40"
              >
                {postingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  )
}
