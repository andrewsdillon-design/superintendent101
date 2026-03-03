'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback, useRef } from 'react'

type Account = 'dillon' | 'ron'

interface MessageSummary {
  uid: number
  subject: string
  from: string
  date: string
  seen: boolean
  preview: string
}

interface MessageFull extends MessageSummary {
  to: string
  html: string | null
  text: string | null
}

interface FolderInfo {
  name: string
  path: string
  unread: number
}

interface ComposeState {
  to: string
  subject: string
  body: string
}

const ACCOUNT_LABELS: Record<Account, string> = {
  dillon: 'Dillon Andrews',
  ron: 'Ron Seitz',
}

const ACCOUNT_EMAILS: Record<Account, string> = {
  dillon: 'dillon@profieldhub.com',
  ron: 'ron@profieldhub.com',
}

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function AdminMailPage() {
  const [account, setAccount] = useState<Account>('dillon')
  const [folders, setFolders] = useState<FolderInfo[]>([])
  const [activeFolder, setActiveFolder] = useState('INBOX')
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [selectedMsg, setSelectedMsg] = useState<MessageFull | null>(null)
  const [loadingMsg, setLoadingMsg] = useState(false)
  const [composing, setComposing] = useState(false)
  const [compose, setCompose] = useState<ComposeState>({ to: '', subject: '', body: '' })
  const [sendingMail, setSendingMail] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendOk, setSendOk] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Keyboard shortcut: c = compose
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'c' && !composing && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setComposing(true)
      }
      if (e.key === 'Escape') setComposing(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [composing])

  const loadFolders = useCallback(async (acc: Account) => {
    setLoadingFolders(true)
    try {
      const res = await fetch(`/api/admin/mail/folders?account=${acc}`)
      if (res.ok) {
        const data = await res.json()
        setFolders(data.folders ?? [])
      }
    } finally {
      setLoadingFolders(false)
    }
  }, [])

  const loadMessages = useCallback(async (acc: Account, folder: string, pg: number) => {
    setLoadingMessages(true)
    setSelectedMsg(null)
    try {
      const res = await fetch(`/api/admin/mail/messages?account=${acc}&folder=${encodeURIComponent(folder)}&page=${pg}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
        setTotal(data.total ?? 0)
      }
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  // Load when account/folder/page change
  useEffect(() => {
    loadFolders(account)
    loadMessages(account, activeFolder, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, activeFolder, page])

  function switchAccount(acc: Account) {
    setAccount(acc)
    setActiveFolder('INBOX')
    setPage(1)
    setSelectedMsg(null)
    setMessages([])
    setFolders([])
  }

  function switchFolder(path: string) {
    setActiveFolder(path)
    setPage(1)
    setSelectedMsg(null)
  }

  async function openMessage(msg: MessageSummary) {
    setLoadingMsg(true)
    setSelectedMsg(null)
    try {
      const res = await fetch(
        `/api/admin/mail/message?account=${account}&folder=${encodeURIComponent(activeFolder)}&uid=${msg.uid}`
      )
      if (res.ok) {
        const data = await res.json()
        setSelectedMsg(data.message)
        // Mark as read in local list
        setMessages(prev => prev.map(m => m.uid === msg.uid ? { ...m, seen: true } : m))
      }
    } finally {
      setLoadingMsg(false)
    }
  }

  async function deleteMessage(uid: number) {
    await fetch('/api/admin/mail/message', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, folder: activeFolder, uid }),
    })
    setMessages(prev => prev.filter(m => m.uid !== uid))
    if (selectedMsg?.uid === uid) setSelectedMsg(null)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSendError('')
    setSendOk(false)
    setSendingMail(true)
    try {
      const res = await fetch('/api/admin/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account,
          to: compose.to,
          subject: compose.subject,
          html: compose.body.replace(/\n/g, '<br/>'),
        }),
      })
      if (res.ok) {
        setSendOk(true)
        setCompose({ to: '', subject: '', body: '' })
        setTimeout(() => { setSendOk(false); setComposing(false) }, 2000)
      } else {
        const d = await res.json()
        setSendError(d.error ?? 'Send failed')
      }
    } finally {
      setSendingMail(false)
    }
  }

  function startReply() {
    if (!selectedMsg) return
    setCompose({
      to: selectedMsg.from.match(/<(.+)>/)?.[1] ?? selectedMsg.from,
      subject: selectedMsg.subject.startsWith('Re:') ? selectedMsg.subject : `Re: ${selectedMsg.subject}`,
      body: '',
    })
    setComposing(true)
  }

  const pageSize = 25
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const inboxUnread = folders.find(f => f.path === 'INBOX' || f.name === 'Inbox')?.unread ?? 0

  return (
    <div className="min-h-screen blueprint-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <span className="text-safety-orange font-bold text-sm">ADMIN</span>
            <nav className="flex gap-4 text-sm ml-4">
              <Link href="/admin" className="text-gray-400 hover:text-white">Users</Link>
              <Link href="/admin/analytics" className="text-gray-400 hover:text-white">Analytics</Link>
              <Link href="/admin/companies" className="text-gray-400 hover:text-white">Companies</Link>
              <Link href="/admin/bug-reports" className="text-gray-400 hover:text-white">Bug Reports</Link>
              <span className="text-white font-semibold">Mail</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setComposing(true)} className="btn-primary text-sm">+ Compose</button>
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Dashboard</Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-[1400px] mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-blueprint-grid p-4 space-y-6">
          {/* Account switcher */}
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-widest">Account</p>
            {(['dillon', 'ron'] as Account[]).map(acc => (
              <button
                key={acc}
                onClick={() => switchAccount(acc)}
                className={`w-full text-left px-3 py-2 text-sm rounded mb-1 transition-colors ${
                  account === acc
                    ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                    : 'text-gray-400 hover:text-white hover:bg-blueprint-paper/20'
                }`}
              >
                <div className="font-semibold">{ACCOUNT_LABELS[acc].split(' ')[0]}</div>
                <div className="text-xs truncate opacity-70">{ACCOUNT_EMAILS[acc]}</div>
              </button>
            ))}
          </div>

          {/* Folders */}
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold mb-2 tracking-widest">Folders</p>
            {loadingFolders ? (
              <p className="text-xs text-gray-500">Loading...</p>
            ) : folders.length === 0 ? (
              <p className="text-xs text-gray-500">No folders</p>
            ) : (
              folders.map(f => (
                <button
                  key={f.path}
                  onClick={() => switchFolder(f.path)}
                  className={`w-full text-left px-3 py-2 text-sm rounded mb-1 flex justify-between items-center transition-colors ${
                    activeFolder === f.path
                      ? 'bg-safety-orange/10 text-safety-orange border border-safety-orange/30'
                      : 'text-gray-400 hover:text-white hover:bg-blueprint-paper/20'
                  }`}
                >
                  <span>{f.name}</span>
                  {f.unread > 0 && (
                    <span className="text-xs bg-safety-orange text-black font-bold px-1.5 py-0.5 rounded-full">
                      {f.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Message list */}
        <div className="w-72 shrink-0 border-r border-blueprint-grid overflow-y-auto" style={{ maxHeight: 'calc(100vh - 65px)' }}>
          <div className="p-3 border-b border-blueprint-grid flex justify-between items-center">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">
              {folders.find(f => f.path === activeFolder)?.name ?? activeFolder}
            </p>
            <p className="text-xs text-gray-500">{total} msgs</p>
          </div>

          {loadingMessages ? (
            <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No messages</div>
          ) : (
            <>
              {messages.map(msg => (
                <button
                  key={msg.uid}
                  onClick={() => openMessage(msg)}
                  className={`w-full text-left p-3 border-b border-blueprint-grid/40 hover:bg-blueprint-paper/20 transition-colors ${
                    selectedMsg?.uid === msg.uid ? 'bg-blueprint-paper/30 border-l-2 border-l-neon-cyan' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className={`text-xs truncate flex-1 ${msg.seen ? 'text-gray-400' : 'text-white font-semibold'}`}>
                      {msg.from || '(unknown)'}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">{formatDate(msg.date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!msg.seen && <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan shrink-0" />}
                    <p className={`text-xs truncate ${msg.seen ? 'text-gray-500' : 'text-gray-300'}`}>
                      {msg.subject || '(no subject)'}
                    </p>
                  </div>
                </button>
              ))}
              {/* Pagination */}
              {pages > 1 && (
                <div className="flex justify-between p-3 border-t border-blueprint-grid">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-xs text-gray-400 hover:text-white disabled:opacity-40"
                  >← Prev</button>
                  <span className="text-xs text-gray-500">{page}/{pages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="text-xs text-gray-400 hover:text-white disabled:opacity-40"
                  >Next →</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Message viewer */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 65px)' }}>
          {loadingMsg ? (
            <div className="p-8 text-center text-gray-400">Loading message...</div>
          ) : selectedMsg ? (
            <div className="flex flex-col h-full">
              {/* Message header */}
              <div className="p-6 border-b border-blueprint-grid">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="font-display text-lg font-bold text-white pr-4">
                    {selectedMsg.subject || '(no subject)'}
                  </h2>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={startReply} className="btn-secondary text-xs px-3 py-1.5">
                      ↩ Reply
                    </button>
                    <button
                      onClick={() => deleteMessage(selectedMsg.uid)}
                      className="text-xs px-3 py-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      Trash
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-12 shrink-0">From:</span>
                    <span className="text-gray-200">{selectedMsg.from}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-12 shrink-0">To:</span>
                    <span className="text-gray-200">{selectedMsg.to || ACCOUNT_EMAILS[account]}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-12 shrink-0">Date:</span>
                    <span className="text-gray-400">
                      {selectedMsg.date ? new Date(selectedMsg.date).toLocaleString() : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 p-6">
                {selectedMsg.html ? (
                  <iframe
                    ref={iframeRef}
                    sandbox="allow-same-origin"
                    srcDoc={selectedMsg.html}
                    className="w-full bg-white rounded"
                    style={{ minHeight: '500px', border: 'none' }}
                    onLoad={() => {
                      // Auto-height
                      const iframe = iframeRef.current
                      if (iframe?.contentDocument?.body) {
                        iframe.style.height = iframe.contentDocument.body.scrollHeight + 32 + 'px'
                      }
                    }}
                  />
                ) : (
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {selectedMsg.text ?? '(empty)'}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500">
              <p className="text-4xl mb-4">✉</p>
              <p className="text-sm">Select a message to read</p>
              <p className="text-xs mt-2 opacity-60">Press <kbd className="px-1.5 py-0.5 border border-gray-600 rounded text-gray-400 text-xs font-mono">c</kbd> to compose</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {composing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-blueprint-grid rounded-lg w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center px-5 py-4 border-b border-blueprint-grid">
              <h3 className="font-display font-bold text-white text-sm">
                New Message — {ACCOUNT_LABELS[account]} &lt;{ACCOUNT_EMAILS[account]}&gt;
              </h3>
              <button onClick={() => setComposing(false)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <form onSubmit={handleSend} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">To</label>
                <input
                  type="email"
                  required
                  value={compose.to}
                  onChange={e => setCompose(c => ({ ...c, to: e.target.value }))}
                  className="bg-blueprint-bg border border-blueprint-grid p-2 text-white w-full text-sm"
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={compose.subject}
                  onChange={e => setCompose(c => ({ ...c, subject: e.target.value }))}
                  className="bg-blueprint-bg border border-blueprint-grid p-2 text-white w-full text-sm"
                  placeholder="Subject"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Message</label>
                <textarea
                  required
                  rows={10}
                  value={compose.body}
                  onChange={e => setCompose(c => ({ ...c, body: e.target.value }))}
                  className="bg-blueprint-bg border border-blueprint-grid p-2 text-white w-full text-sm resize-none"
                  placeholder="Write your message..."
                />
              </div>
              {sendError && <p className="text-red-400 text-sm">{sendError}</p>}
              {sendOk && <p className="text-safety-green text-sm">✓ Message sent</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setComposing(false)} className="btn-secondary text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={sendingMail} className="btn-primary text-sm disabled:opacity-50">
                  {sendingMail ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
