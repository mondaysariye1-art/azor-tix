import 'server-only'

type Bucket = {
  count: number
  resetAt: number
}

const globalForRateLimit = globalThis as unknown as {
  __azorRateLimitStore?: Map<string, Bucket>
}

function getBuckets(): Map<string, Bucket> {
  if (!globalForRateLimit.__azorRateLimitStore) {
    globalForRateLimit.__azorRateLimitStore = new Map()
  }
  return globalForRateLimit.__azorRateLimitStore
}

export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

export function checkRateLimit(
  key: string,
  options: { maxRequests: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const buckets = getBuckets()
  const now = Date.now()
  if (buckets.size > 5000) {
    for (const [k, v] of buckets.entries()) {
      if (v.resetAt <= now) buckets.delete(k)
    }
  }
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }
  if (existing.count >= options.maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }
  existing.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}
