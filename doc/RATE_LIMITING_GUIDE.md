# Rate Limiting Guide

## Current Implementation

The application currently uses **in-memory Map** for rate limiting in `api/chat.ts` and `api/transcribe.ts`.

## ✅ **Is This Production Ready?**

**YES, for single-instance deployments!**

- ✅ **Vercel Serverless Functions** - Each function instance has its own memory
- ✅ **Works perfectly** for single-instance deployments
- ✅ **No Redis needed** initially

## ⚠️ **When Do You Need Redis?**

You only need Redis/Vercel KV if:
- You're running **multiple server instances** (not serverless)
- You need **shared rate limiting** across instances
- You're experiencing rate limit inconsistencies

## 🚀 **Upgrade Options (When Needed)**

### Option 1: Vercel KV (Easiest - Recommended for Vercel)

**Setup:**
1. Install: `npm install @vercel/kv`
2. Create KV store in Vercel dashboard
3. Update `api/chat.ts`:

```typescript
import { kv } from '@vercel/kv'

async function checkRateLimit(userId: string) {
  const key = `rate_limit:chat:${userId}`
  const now = Date.now()
  
  // Get current count
  const current = await kv.get<number>(key) || 0
  
  if (current >= RATE_LIMIT.maxRequests) {
    const ttl = await kv.ttl(key)
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: now + (ttl * 1000) 
    }
  }
  
  // Increment and set expiry
  await kv.incr(key)
  await kv.expire(key, Math.floor(RATE_LIMIT.windowMs / 1000))
  
  return { 
    allowed: true, 
    remaining: RATE_LIMIT.maxRequests - current - 1, 
    resetTime: now + RATE_LIMIT.windowMs 
  }
}
```

**Cost:** Free tier available, then ~$0.20/month per 1M operations

### Option 2: Supabase Edge Functions with Redis

Use Supabase Edge Functions instead of Vercel functions, with Redis connection.

### Option 3: Keep In-Memory (Current)

**Keep as-is if:**
- Using Vercel serverless functions (recommended)
- Single-instance deployments
- Rate limiting works fine

## 📊 **Current Rate Limits**

- **Chat API:** 20 requests/minute per user
- **Transcription API:** 10 requests/minute per user

## ✅ **Recommendation**

**For now:** Keep in-memory Map - it works perfectly for Vercel serverless functions.

**Upgrade later:** Only if you need shared rate limiting across multiple instances (rare for serverless).

