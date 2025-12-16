# 🔔 Smart Reminders Debugging Guide

## 📋 **How Reminders Work**

### **Current Implementation:**

1. **ReminderScheduler Component** (`src/components/ReminderScheduler.tsx`)
   - Runs when the app loads
   - Checks if reminders are enabled in user profile
   - Requests notification permission
   - Schedules reminders based on settings

2. **Notification Service** (`src/services/notifications.ts`)
   - Uses browser `Notification` API
   - Schedules reminders using `setTimeout`
   - ⚠️ **Limitation**: Only works when browser tab is open

3. **Reminder Settings** (`src/components/ReminderSettings.tsx`)
   - User can configure reminder times
   - Test notification button available

---

## 🔍 **Why Reminders Might Not Work**

### **1. Notification Permission Not Granted**
- **Check**: Open browser console, look for `[ReminderScheduler] Notification permission:`
- **Fix**: Click "Enable Notifications" button in Profile → Reminders section

### **2. Reminders Disabled in Settings**
- **Check**: Profile → Reminders → "Enable Reminders" toggle must be ON
- **Check**: Individual reminder types (meals, water, etc.) must be enabled

### **3. Browser Tab Closed**
- ⚠️ **Critical Limitation**: Reminders using `setTimeout` only work when the browser tab is open
- If you close the tab, all scheduled reminders are cancelled
- **Solution**: Keep the tab open, or use a PWA installed version

### **4. Browser Notifications Blocked**
- Check browser settings:
  - Chrome: Settings → Privacy → Site Settings → Notifications
  - Firefox: Settings → Privacy → Permissions → Notifications
  - Safari: Preferences → Websites → Notifications

### **5. Profile Not Loaded**
- **Check**: Console logs should show `[ReminderScheduler] Initializing with settings:`
- If you see "No profile", the user profile hasn't loaded yet

---

## 🛠️ **Debugging Steps**

### **Step 1: Check Console Logs**

Open browser DevTools (F12) and look for these logs:

```
[ReminderScheduler] Initializing with settings: {...}
[ReminderScheduler] Notification permission: granted
[ReminderScheduler] Scheduling meal reminders
[ReminderScheduler] Scheduling breakfast reminder at 08:00
[NotificationService] Scheduled reminder "meal-breakfast" for ... (in X minutes)
```

**If you don't see these logs:**
- User not logged in
- Profile not loaded
- Reminders disabled in settings

### **Step 2: Test Notification**

1. Go to **Profile → Reminders**
2. Click **"Test Notification"** button
3. You should see a notification immediately

**If test notification doesn't work:**
- Browser notifications are blocked
- Check browser notification settings
- Try a different browser

### **Step 3: Check Reminder Settings**

1. Go to **Profile → Reminders → Configure**
2. Verify:
   - ✅ "Enable Reminders" is ON
   - ✅ At least one reminder type is enabled (meals, water, etc.)
   - ✅ Times are set correctly

### **Step 4: Check Notification Permission**

In browser console, run:
```javascript
Notification.permission
```

Should return: `"granted"`

If it returns `"default"` or `"denied"`:
- Click "Enable Notifications" in Profile → Reminders
- Or manually enable in browser settings

---

## ⚠️ **Known Limitations**

### **1. Tab Must Be Open**
- Reminders only work when the browser tab is open
- Closing the tab cancels all scheduled reminders
- **Workaround**: Keep tab open, or install as PWA

### **2. No Background Notifications**
- Web browsers don't support true background notifications without:
  - Service Worker with Background Sync API (limited support)
  - Web Push API (requires backend server)
  - Chrome Extension (not applicable for web app)

### **3. Timezone Issues**
- Reminders use browser's local time
- If user travels, reminders may fire at wrong times

---

## 🚀 **Future Improvements**

### **Option 1: Service Worker Alarms API** (Chrome only)
- Use Chrome's `chrome.alarms` API
- Works when tab is closed
- Limited to Chrome/Edge browsers

### **Option 2: Web Push Notifications**
- Requires backend server
- Works across all devices
- Requires user subscription

### **Option 3: PWA Background Sync**
- Use Service Worker periodic sync
- Limited browser support
- Requires user to install PWA

---

## 📝 **Quick Checklist**

- [ ] Notifications enabled in browser settings
- [ ] Notification permission granted (check console)
- [ ] Reminders enabled in Profile → Reminders
- [ ] At least one reminder type enabled (meals, water, etc.)
- [ ] Test notification works
- [ ] Browser tab is open (reminders won't work if closed)
- [ ] Check console logs for errors

---

## 🐛 **Common Issues**

### **Issue: "No reminders scheduled"**
- **Cause**: Reminders disabled or permission denied
- **Fix**: Enable reminders in settings, grant notification permission

### **Issue: "Reminders work but stop after closing tab"**
- **Cause**: Expected behavior - setTimeout only works when tab is open
- **Fix**: Keep tab open or install as PWA

### **Issue: "Test notification doesn't work"**
- **Cause**: Browser notifications blocked
- **Fix**: Check browser notification settings, try different browser

### **Issue: "Reminders fire at wrong time"**
- **Cause**: Timezone mismatch or incorrect time format
- **Fix**: Check browser timezone, verify reminder times in settings

---

## 📞 **Need More Help?**

Check the console logs - they now include detailed information about:
- When reminders are scheduled
- What time they're scheduled for
- Permission status
- Any errors that occur

Look for logs starting with `[ReminderScheduler]` or `[NotificationService]`.

