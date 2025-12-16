# 🌐 Domain Setup: nutriscope.app

## ✅ **Updated Files**

### **1. index.html**
- ✅ Open Graph URL: `https://nutriscope.app/`
- ✅ Twitter Card URL: `https://nutriscope.app/`
- ✅ OG Image: `https://nutriscope.app/og-image.png`
- ✅ Twitter Image: `https://nutriscope.app/og-image.png`
- ✅ Added `og:site_name` and `twitter:site`

### **2. public/manifest.json**
- ✅ `start_url`: `https://nutriscope.app/`
- ✅ `scope`: `https://nutriscope.app/`
- ✅ Shortcut URLs updated to full domain

## 🔧 **Vercel Domain Configuration**

### **Step 1: Add Domain in Vercel**
1. Go to Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter: `nutriscope.app`
4. Click **Add**

### **Step 2: Configure DNS**
Vercel will show you DNS records to add:

**For `nutriscope.app`:**
- **Type:** A
- **Name:** @
- **Value:** 76.76.21.21 (Vercel's IP)

**For `www.nutriscope.app`:**
- **Type:** CNAME
- **Name:** www
- **Value:** cname.vercel-dns.com

### **Step 3: SSL Certificate**
- ✅ Vercel automatically provisions SSL certificates
- ✅ HTTPS will be enabled automatically
- ✅ Wait 24-48 hours for DNS propagation

## 📋 **Domain Checklist**

- [ ] Domain added in Vercel
- [ ] DNS records configured
- [ ] SSL certificate active (auto)
- [ ] Test `https://nutriscope.app` loads
- [ ] Test `https://www.nutriscope.app` redirects (optional)

## 🎯 **What's Updated**

### **Meta Tags (index.html)**
```html
<meta property="og:url" content="https://nutriscope.app/" />
<meta property="og:image" content="https://nutriscope.app/og-image.png" />
<meta name="twitter:url" content="https://nutriscope.app/" />
<meta name="twitter:image" content="https://nutriscope.app/og-image.png" />
```

### **PWA Manifest (manifest.json)**
```json
{
  "start_url": "https://nutriscope.app/",
  "scope": "https://nutriscope.app/",
  "shortcuts": [
    { "url": "https://nutriscope.app/meals" },
    { "url": "https://nutriscope.app/workouts" },
    { "url": "https://nutriscope.app/chat" }
  ]
}
```

## ⚠️ **Important Notes**

1. **PWA Manifest URLs:**
   - Absolute URLs (`https://nutriscope.app/`) are set
   - Relative URLs (`/`) also work, but absolute is more explicit
   - Both approaches are valid

2. **DNS Propagation:**
   - Can take 24-48 hours
   - Use `dig nutriscope.app` to check DNS status

3. **SSL Certificate:**
   - Vercel auto-provisions Let's Encrypt certificates
   - HTTPS will work automatically once DNS propagates

## 🚀 **After Domain Setup**

Once `nutriscope.app` is live:
- ✅ Update any external links
- ✅ Update social media profiles
- ✅ Update app store listings (if applicable)
- ✅ Test PWA installation
- ✅ Verify all URLs work

---

**Domain `nutriscope.app` is now configured in all relevant files!** 🌐

