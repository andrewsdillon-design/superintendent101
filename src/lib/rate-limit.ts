/**
 * Simple in-memory rate limiter.
 * Resets per window — suitable for single-instance Node/PM2 deployments.
 * Replace with Upstash Redis rate limiter if running multiple instances.
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { success: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count }
}

// Prune stale entries every 10 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  store.forEach((win, key) => {
    if (now > win.resetAt) store.delete(key)
  })
}, 10 * 60 * 1000)
