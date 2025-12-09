# ⚠️ Vercel Environment Variables - Security Fix Needed

## 🔴 **Critical Issue Found**

You have `VITE_OPENAI_API_KEY` set, but this is **WRONG** and **INSECURE**!

### **Problem:**
- `VITE_` prefix exposes the variable to the **client/browser**
- OpenAI API keys should **NEVER** be exposed to clients
- Anyone can see your API key in the browser → **Security risk!**

### **Solution:**
1. **Remove** `VITE_OPENAI_API_KEY` from Vercel
2. **Add** `OPENAI_API_KEY` (without `VITE_` prefix) instead

## ✅ **Correct Environment Variables**

### **Current Setup (What You Have):**
```
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY
❌ VITE_OPENAI_API_KEY (WRONG - Remove this!)
✅ VITE_USDA_API_KEY
✅ VITE_APP_ENV
✅ VITE_API_URL
✅ VITE_USE_BACKEND_PROXY
```

### **What You Should Have:**
```
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY
✅ OPENAI_API_KEY (NO VITE_ prefix - server-side only!)
✅ VITE_USDA_API_KEY
✅ VITE_APP_ENV
✅ VITE_API_URL
✅ VITE_USE_BACKEND_PROXY
```

## 🔧 **How to Fix**

### **Step 1: Remove Insecure Variable**
1. In Vercel Dashboard → Environment Variables
2. Find `VITE_OPENAI_API_KEY`
3. Click the "..." menu → **Delete**

### **Step 2: Add Secure Variable**
1. Click "Add New"
2. **Name:** `OPENAI_API_KEY` (NO `VITE_` prefix!)
3. **Value:** Your OpenAI API key (same value you had)
4. **Environment:** Select all (Production, Preview, Development)
5. Click "Save"

### **Step 3: Redeploy**
- Vercel will auto-redeploy, or click "Redeploy" manually

## 🔐 **Why This Matters**

### **With `VITE_OPENAI_API_KEY` (WRONG):**
```
❌ Exposed to browser
❌ Anyone can see it in DevTools
❌ Can be stolen and used
❌ You'll pay for others' usage
```

### **With `OPENAI_API_KEY` (CORRECT):**
```
✅ Server-side only
✅ Never exposed to client
✅ Secure in Vercel functions
✅ Only your API routes can use it
```

## 📋 **How It Works**

Your app uses **backend proxy** (`/api/chat.ts`, `/api/transcribe.ts`):

1. **Frontend** calls `/api/chat` (no API key needed)
2. **Vercel Function** (`api/chat.ts`) uses `OPENAI_API_KEY` (server-side)
3. **OpenAI API** receives request from server
4. **Response** sent back to frontend

The API key **never** leaves the server!

## ✅ **Final Checklist**

- [ ] Remove `VITE_OPENAI_API_KEY`
- [ ] Add `OPENAI_API_KEY` (no VITE_ prefix)
- [ ] Keep `VITE_USE_BACKEND_PROXY=true`
- [ ] Keep `VITE_API_URL=/api/chat`
- [ ] Redeploy

---

**Fix this immediately to secure your OpenAI API key!** 🔒

