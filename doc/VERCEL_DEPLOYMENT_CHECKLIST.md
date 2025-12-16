# 🚀 Vercel Deployment Checklist

## ✅ **Build Status**

**Current:** ⚠️ **TypeScript errors need fixing** before deployment

## 🔴 **Critical Issues to Fix**

### 1. **TypeScript Build Errors**
- Missing imports (logger in audio.ts)
- Missing state variables (validationErrors in MealsPage.tsx)
- Type errors (supabase possibly null)
- Unused variables (can be fixed with `// @ts-ignore` or removal)

### 2. **Required Fixes Before Deploy**

**Priority 1 - Must Fix:**
- [x] Fix logger import in `src/services/audio.ts`
- [x] Add validationErrors state in `src/pages/MealsPage.tsx`
- [x] Add validateNumber import in `src/pages/MealsPage.tsx`
- [ ] Fix OnboardingDialog props (remove isGuest)
- [ ] Fix supabase null checks (add `!supabase` guards)

**Priority 2 - Should Fix:**
- [ ] Remove unused imports/variables
- [ ] Fix type mismatches

## 📋 **Vercel Configuration**

### ✅ **Already Configured:**
- ✅ `vercel.json` - API routes configured
- ✅ Build command: `npm run build`
- ✅ Output directory: `dist` (Vite default)
- ✅ Node.js version: Auto-detected

### ⚙️ **Environment Variables Needed:**

**Required:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Optional (for AI features):**
```env
OPENAI_API_KEY=sk-... (server-side only, NOT VITE_)
VITE_USE_BACKEND_PROXY=true
VITE_API_URL=/api/chat
```

**Optional (for food search):**
```env
VITE_USDA_API_KEY=your_usda_key
```

**Optional (for error tracking):**
```env
VITE_SENTRY_DSN=your_sentry_dsn (skip for now)
```

## 🚀 **Deployment Steps**

### 1. **Fix TypeScript Errors**
```bash
npm run build
# Fix all errors until build succeeds
```

### 2. **Set Environment Variables in Vercel**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all required variables
3. Set for: Production, Preview, Development

### 3. **Deploy**
```bash
# Option 1: Via Vercel CLI
vercel --prod

# Option 2: Via Git (recommended)
git push origin main
# Vercel auto-deploys on push
```

### 4. **Verify Deployment**
- ✅ Check build logs for errors
- ✅ Test API routes (`/api/chat`, `/api/transcribe`)
- ✅ Test authentication
- ✅ Test guest mode
- ✅ Test PWA installation

## 📊 **Build Configuration**

### **Current Build Settings:**
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Node Version:** 18.x (auto)

### **API Routes:**
- ✅ `/api/chat.ts` - OpenAI chat proxy
- ✅ `/api/transcribe.ts` - Whisper transcription proxy
- ✅ Max duration: 30 seconds (configured in vercel.json)

## ⚠️ **Known Issues**

1. **TypeScript strict mode** - Many `supabase` possibly null errors
   - **Fix:** Add `if (!supabase) return` guards
   - **Or:** Use `supabase!` assertion (less safe)

2. **Unused variables** - Many TS6133 errors
   - **Fix:** Remove unused imports/variables
   - **Or:** Add `// @ts-ignore` (not recommended)

## ✅ **What's Already Ready**

- ✅ Vercel configuration (`vercel.json`)
- ✅ Build optimizations (code splitting, minification)
- ✅ API routes configured
- ✅ Environment variable handling
- ✅ PWA setup
- ✅ Error boundaries
- ✅ Production logger

## 🎯 **Next Steps**

1. **Fix TypeScript errors** (see above)
2. **Test build locally:** `npm run build`
3. **Set environment variables in Vercel**
4. **Deploy:** `vercel --prod` or push to Git
5. **Monitor:** Check Vercel logs for any runtime errors

---

**Status:** ⚠️ **Fix TypeScript errors first, then ready to deploy!**

