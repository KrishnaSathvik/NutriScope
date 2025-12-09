# Sentry Setup Guide

## ✅ Step 1: Select React Platform
On the Sentry onboarding page, click on **REACT** (the blue atom-like icon with 'JS').

## ✅ Step 2: Complete Sentry Setup
Follow the Sentry wizard to:
1. Select React as your platform
2. Name your project (e.g., "NutriScope")
3. Complete the setup steps

## ✅ Step 3: Get Your DSN
After setup, Sentry will show you a **DSN** (Data Source Name) that looks like:
```
https://abc123@o123456.ingest.sentry.io/123456
```

## ✅ Step 4: Add DSN to Environment Variables

### For Development:
Create or update `.env` file in the root directory:
```env
VITE_SENTRY_DSN=https://your-dsn-here@o123456.ingest.sentry.io/123456
```

### For Production (Vercel):
1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - **Name:** `VITE_SENTRY_DSN`
   - **Value:** Your Sentry DSN
   - **Environment:** Production, Preview, Development (select all)

## ✅ Step 5: Restart Dev Server
```bash
npm run dev
```

## ✅ Step 6: Test Error Tracking
Sentry will automatically capture:
- ✅ Unhandled errors
- ✅ React component errors (via ErrorBoundary)
- ✅ Console errors
- ✅ Network errors

## 📊 What Gets Tracked

Sentry will track:
- **Errors:** All unhandled exceptions
- **Performance:** Page load times, API calls
- **User Sessions:** Error replays (with privacy settings)
- **Breadcrumbs:** User actions leading to errors

## 🔒 Privacy Settings

Sentry is configured with:
- ✅ Text masking (sensitive data hidden)
- ✅ Media blocking in replays
- ✅ API key filtering
- ✅ Low sample rates in production (10%)

## 🎯 Next Steps

Once configured:
1. Errors will automatically appear in your Sentry dashboard
2. You'll get email notifications for new errors
3. You can set up alerts and integrations
4. View error trends and user impact

---

**Note:** Sentry is already integrated in your codebase. Just add the DSN and it will start working automatically!

