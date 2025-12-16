# 🏗️ NutriScope Architecture

## 📊 **Server Architecture Overview**

### **Backend: Supabase** ✅

**Supabase is your main backend/server** providing:

1. **PostgreSQL Database**
   - All data storage (meals, workouts, profiles, etc.)
   - Row Level Security (RLS) for data protection
   - Real-time subscriptions for live updates

2. **Authentication**
   - Email/Password authentication
   - Anonymous authentication (guest mode)
   - Session management

3. **Storage**
   - Image uploads (chat images, recipe photos)
   - File storage via Supabase Storage

4. **Real-time**
   - Live data synchronization across clients
   - WebSocket connections for instant updates

5. **API**
   - RESTful API (auto-generated from database)
   - PostgREST for database queries
   - Edge Functions (optional, for custom logic)

### **API Proxy: Vercel Serverless Functions** 🔄

**Vercel functions** handle OpenAI API calls:

1. **`/api/chat.ts`**
   - Proxies OpenAI GPT-4o-mini requests
   - Keeps API keys server-side
   - Rate limiting
   - Request validation

2. **`/api/transcribe.ts`**
   - Proxies OpenAI Whisper transcription
   - Audio processing
   - Rate limiting

**Why Vercel Functions?**
- Keeps OpenAI API keys secure (not exposed to client)
- Server-side rate limiting
- Request validation
- Cost control

## 🎯 **Complete Architecture**

```
┌─────────────────┐
│   React App     │  (Frontend - Vercel)
│   (Vite)        │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│   Supabase      │  │  Vercel API     │
│   Backend       │  │  Functions      │
│                 │  │                 │
│ • PostgreSQL    │  │ • /api/chat     │
│ • Auth          │  │ • /api/transcribe│
│ • Storage       │  │                 │
│ • Real-time     │  │ (OpenAI Proxy)  │
└─────────────────┘  └────────┬────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  OpenAI API  │
                        │  (External)  │
                        └──────────────┘
```

## 📋 **What Runs Where**

### **Supabase (Backend Server)**
- ✅ Database queries
- ✅ User authentication
- ✅ Data storage
- ✅ Real-time subscriptions
- ✅ File storage
- ✅ Row Level Security

### **Vercel (Frontend + API Proxy)**
- ✅ React app hosting
- ✅ Static file serving
- ✅ OpenAI API proxy (`/api/chat`, `/api/transcribe`)
- ✅ Serverless functions

### **OpenAI (External Service)**
- ✅ AI chat (GPT-4o-mini)
- ✅ Voice transcription (Whisper)
- ✅ Image analysis (Vision)

## 🔑 **Environment Variables**

### **Supabase (Required)**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### **OpenAI (For AI Features)**
```env
OPENAI_API_KEY=sk-... (server-side in Vercel, NOT VITE_)
VITE_USE_BACKEND_PROXY=true
```

## 🎯 **Summary**

**Yes, Supabase is your main server/backend!**

- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Authentication
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **API Proxy**: Vercel Functions (for OpenAI only)

Your app is a **Supabase-powered application** with Vercel handling:
1. Frontend hosting
2. OpenAI API proxy (for security)

---

**All your data, authentication, and backend logic runs on Supabase!** 🚀

