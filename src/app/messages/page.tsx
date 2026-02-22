import Link from 'next/link'

const conversations = [
  { id: '1', user: { name: 'Mike Smith', username: 'mikesmith', avatar: 'MS' }, lastMessage: 'Sounds good, see you at 2pm', time: '2:30 PM', unread: true },
  { id: '2', user: { name: 'Rachel Johnson', username: 'racheljohnson', avatar: 'RJ' }, lastMessage: 'Thanks for the advice on the slab pour', time: 'Yesterday', unread: false },
  { id: '3', user: { name: 'David Chen', username: 'davidchen', avatar: 'DC' }, lastMessage: 'The schedule looks tight but doable', time: 'Yesterday', unread: false },
]

export default function MessagesPage() {
  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">S101</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400">Feed</Link>
              <Link href="/mentors" className="text-gray-400">Mentors</Link>
              <Link href="/dust-logs" className="text-gray-400">Dust Logs</Link>
              <Link href="/messages" className="text-white font-semibold">Messages</Link>
            </nav>
          </div>
          <Link href="/profile" className="text-sm text-gray-400">Profile</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-safety-blue mb-6">MESSAGES</h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-2">
            {conversations.map((conv) => (
              <div key={conv.id} className={`card cursor-pointer ${conv.unread ? 'border-l-4 border-neon-cyan' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blueprint-paper rounded-full flex items-center justify-center text-sm font-bold">
                    {conv.user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-sm">{conv.user.name}</p>
                      <span className="text-xs text-gray-500">{conv.time}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{conv.lastMessage}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 card">
            <div className="h-96 flex items-center justify-center text-gray-500">
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
