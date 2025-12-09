# 🔐 Vercel Environment Variables Guide

## ✅ **Required Environment Variables**

These **MUST** be added to Vercel for the app to work:

### **1. Supabase (Required)**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
**Why:** Needed for database, authentication, and all backend features.

---

## ⚠️ **Required for AI Features**

These are needed if you want AI chat/transcription to work:

### **2. OpenAI API (Required for Chat/Transcription)**
```env
OPENAI_API_KEY=sk-...your-openai-api-key
```
**Important:** 
- ✅ Add this in Vercel (server-side)
- ❌ **DO NOT** add `VITE_OPENAI_API_KEY` (we use backend proxy)
- This goes in Vercel's environment variables (not prefixed with `VITE_`)

### **3. Backend Proxy Settings (Required for AI)**
```env
VITE_USE_BACKEND_PROXY=true
VITE_API_URL=/api/chat
```
**Why:** Tells the app to use Vercel serverless functions instead of direct OpenAI calls.

---

## 🔵 **Optional Environment Variables**

These are nice-to-have but not required:

### **4. USDA Food Database (Optional)**
```env
VITE_USDA_API_KEY=your_usda_api_key
```
**Why:** Enables food database search feature (300,000+ foods).
**Get it:** https://fdc.nal.usda.gov/api-key-sign-up.html (free)

### **5. Sentry Error Tracking (Optional - Skip for now)**
```env
VITE_SENTRY_DSN=your_sentry_dsn
```
**Why:** Production error tracking (we're skipping this for now).

### **6. App Environment (Optional)**
```env
VITE_APP_ENV=production
```
**Why:** Helps identify environment in logs (optional).

---

## 📋 **Quick Setup Checklist**

### **Step 1: Go to Vercel Dashboard**
1. Open your project: https://vercel.com/dashboard
2. Click on your project → **Settings** → **Environment Variables**

### **Step 2: Add Required Variables**

**Minimum Required (App works, but no AI):**
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`

**For Full Features (Including AI):**
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `OPENAI_API_KEY` (server-side, no VITE_ prefix)
- [ ] `VITE_USE_BACKEND_PROXY=true`
- [ ] `VITE_API_URL=/api/chat`

**Optional:**
- [ ] `VITE_USDA_API_KEY` (for food search)
- [ ] `VITE_APP_ENV=production`

### **Step 3: Set for All Environments**
For each variable, select:
- ✅ **Production**
- ✅ **Preview** 
- ✅ **Development**

### **Step 4: Redeploy**
After adding variables, Vercel will auto-redeploy, or click **Redeploy** manually.

---

## 🎯 **Summary**

### **Minimum (App Works):**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### **Recommended (Full Features):**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
OPENAI_API_KEY (no VITE_ prefix!)
VITE_USE_BACKEND_PROXY=true
VITE_API_URL=/api/chat
```

### **Optional:**
```
VITE_USDA_API_KEY (for food search)
VITE_APP_ENV=production
```

---

## ⚠️ **Important Notes**

1. **`OPENAI_API_KEY`** - NO `VITE_` prefix (server-side only)
2. **All `VITE_` variables** - Exposed to client (safe for public keys)
3. **`OPENAI_API_KEY`** - Keep secret (server-side only)
4. **Set for all environments** - Production, Preview, Development

---

## 🔍 **Where to Find Your Keys**

### **Supabase:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → API
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### **OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy → `OPENAI_API_KEY` (add to Vercel)

### **USDA (Optional):**
1. Go to https://fdc.nal.usda.gov/api-key-sign-up.html
2. Sign up (free)
3. Get API key → `VITE_USDA_API_KEY`

---

**Yes, add all required environment variables in Vercel!** 🚀

