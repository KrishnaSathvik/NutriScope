# Security & Reliability Implementation Guide

This document outlines the security and reliability improvements implemented in NutriScope.

## ✅ Implemented Features

### 1. Error Boundaries
- **Location**: `src/components/ErrorBoundary.tsx`
- **Purpose**: Catch React component errors and display user-friendly error pages
- **Features**:
  - Catches unhandled errors in component tree
  - Displays error details in development mode
  - Provides "Try Again" and "Go Home" options
  - Integrates with Sentry for error tracking

**Usage**: Already integrated in `App.tsx` wrapping the entire application.

### 2. Error Tracking (Sentry)
- **Location**: `src/lib/sentry.ts`
- **Status**: Ready to use (requires installation)
- **Setup**:
  1. Install Sentry: `npm install @sentry/react`
  2. Get DSN from https://sentry.io
  3. Add `VITE_SENTRY_DSN` to `.env`
  4. Uncomment initialization code in `sentry.ts`

**Features**:
- Automatic error capture
- Performance monitoring
- Session replay
- Source map support
- Filters sensitive data

### 3. Backend API Proxy
- **Location**: `api/chat.ts`, `api/transcribe.ts`
- **Purpose**: Secure server-side API calls to OpenAI
- **Features**:
  - Keeps API keys server-side only
  - Rate limiting per user
  - Request validation
  - Error handling
  - Rate limit headers in responses

**Deployment**: 
- Vercel: Automatically deploys as serverless functions
- Other platforms: Use Node.js/Express equivalent

### 4. Rate Limiting
- **Implementation**: In-memory store (use Redis in production)
- **Limits**:
  - Chat API: 20 requests/minute per user
  - Transcription API: 10 requests/minute per user
- **Response**: 429 status with reset time

**Production**: Replace in-memory store with Redis for multi-instance deployments.

### 5. Server-Side Validation
- **Location**: `api/chat.ts`, `api/transcribe.ts`
- **Validations**:
  - Request method (POST only)
  - Message structure and content
  - Payload size limits (100KB for chat)
  - Audio file size (25MB max for transcription)
  - Required fields

## 🔧 Configuration

### Environment Variables

Add to `.env`:
```env
# Backend API (optional - defaults to /api/chat)
VITE_API_URL=/api/chat
VITE_USE_BACKEND_PROXY=true

# Sentry (optional)
VITE_SENTRY_DSN=your_sentry_dsn
```

### Vercel Environment Variables

Add to Vercel dashboard:
```env
OPENAI_API_KEY=your_openai_api_key
```

## 📝 Frontend Updates

### Services Updated
- `src/services/aiChat.ts`: Uses backend proxy when available
- `src/services/audio.ts`: Uses backend proxy for transcription
- `src/pages/ChatPage.tsx`: Passes userId to API calls

### Fallback Behavior
- In development: Falls back to direct OpenAI if proxy fails
- In production: Throws error if proxy fails (no fallback)

## 🚀 Deployment

### Vercel
1. Push code to repository
2. Import project in Vercel
3. Add environment variables:
   - `OPENAI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SENTRY_DSN` (optional)
4. Deploy

### Other Platforms
Convert `api/` functions to your platform's serverless format:
- AWS Lambda
- Google Cloud Functions
- Azure Functions
- Express.js server

## 🔒 Security Best Practices

1. **API Keys**: Never expose in frontend code
2. **Rate Limiting**: Implement per-user limits
3. **Validation**: Validate all inputs server-side
4. **Error Messages**: Don't expose internal errors
5. **CORS**: Configure properly for your domain
6. **HTTPS**: Always use HTTPS in production

## 📊 Monitoring

### Error Tracking
- Sentry dashboard shows errors, stack traces, and user context
- Set up alerts for critical errors

### Rate Limiting
- Monitor rate limit hits in logs
- Adjust limits based on usage patterns

### API Usage
- Track OpenAI API usage and costs
- Monitor response times

## 🐛 Troubleshooting

### Backend Proxy Not Working
1. Check `VITE_USE_BACKEND_PROXY` is `true`
2. Verify API routes are deployed
3. Check Vercel function logs
4. Verify `OPENAI_API_KEY` is set in Vercel

### Rate Limiting Issues
1. Check user ID is being passed correctly
2. Verify rate limit store is working
3. Check reset times in response headers

### Error Tracking Not Working
1. Verify Sentry is installed
2. Check `VITE_SENTRY_DSN` is set
3. Uncomment initialization code in `sentry.ts`
4. Check browser console for errors

## 🔄 Migration from Direct OpenAI

The code automatically uses backend proxy when:
- `VITE_USE_BACKEND_PROXY=true` (default)
- Backend API is accessible
- User ID is provided

To force direct OpenAI (dev only):
```env
VITE_USE_BACKEND_PROXY=false
```

## 📚 Next Steps

1. **Install Sentry**: `npm install @sentry/react`
2. **Add Sentry DSN** to `.env`
3. **Deploy API routes** to Vercel
4. **Monitor errors** in Sentry dashboard
5. **Set up alerts** for critical errors
6. **Replace in-memory rate limiting** with Redis (production)

