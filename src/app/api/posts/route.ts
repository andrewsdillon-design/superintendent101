// API route for posts
import { NextRequest, NextResponse } from 'next/server'

// Sample data
const posts = [
  {
    id: '1',
    author: { name: 'John Doe', username: 'johndoe' },
    content: 'Walked the slab this morning before pour. Found three areas where rebar spacing was off. Got it fixed before concrete trucks showed up.',
    tags: ['safety', 'concrete'],
    type: 'SAFETY_OBSERVATION',
    createdAt: '2026-02-21T10:00:00Z',
    likes: 12,
    comments: 3,
  },
  {
    id: '2',
    author: { name: 'Mike Smith', username: 'mikesmith', role: 'MENTOR' },
    content: '20 years in this business and I still learn something new every week. The day you think you know everything is the day you become dangerous.',
    tags: ['lessons-learned'],
    type: 'STORY',
    createdAt: '2026-02-21T08:00:00Z',
    likes: 45,
    comments: 8,
  },
]

export async function GET(request: NextRequest) {
  return NextResponse.json({ posts })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const newPost = {
    id: String(posts.length + 1),
    author: { name: 'You', username: 'you' },
    content: body.content,
    tags: body.tags || [],
    type: body.type || 'DISCUSSION',
    createdAt: new Date().toISOString(),
    likes: 0,
    comments: 0,
  }
  
  posts.unshift(newPost)
  
  return NextResponse.json({ post: newPost })
}
