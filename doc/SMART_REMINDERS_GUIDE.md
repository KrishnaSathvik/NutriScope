# 🔔 Smart Real-Time Reminders Implementation Guide

## Overview

This guide explains how the **Smart Real-Time Reminders** system works in NutriScope. Unlike traditional web reminders that only work when the browser tab is open, this implementation uses **Service Workers** and **IndexedDB** to provide reminders that work even when the tab is closed, making it perfect for PWAs.

## 🎯 Key Features

✅ **Works When Tab is Closed** - Reminders trigger even when browser tab is closed  
✅ **Persistent Storage** - Uses IndexedDB to store reminders across sessions  
✅ **Background Processing** - Service Worker checks reminders every minute  
✅ **Smart Scheduling** - Context-aware reminder timing  
✅ **Multiple Reminder Types** - Daily, weekly, and recurring reminders  
✅ **Notification Click Handling** - Opens app to relevant page when clicked  

---

## 🏗️ Architecture

### Components

1. **ReminderStorage Service** (`src/services/reminderStorage.ts`)
   - Manages IndexedDB operations
   - Stores and retrieves reminders
   - Handles reminder updates

2. **SmartReminder Service** (`src/services/smartReminders.ts`)
   - Creates reminders from user settings
   - Calculates optimal trigger times
   - Provides context-aware logic

3. **Service Worker** (`public/sw.js`)
   - Runs in background
   - Checks reminders every minute
   - Triggers notifications
   - Handles notification clicks

4. **ReminderScheduler Component** (`src/components/ReminderScheduler.tsx`)
   - Initializes reminders when app loads
   - Syncs with user settings
   - Falls back to basic reminders if needed

---

## 📊 How It Works

### 1. **Reminder Creation**

When a user enables reminders in their profile:

```typescript
// User enables reminders in Profile → Reminder Settings
// ReminderScheduler detects settings change
await smartReminderService.createReminderFromSettings(userId, settings)
```

**What happens:**
1. Reminders are created from user settings
2. Each reminder is stored in IndexedDB with:
   - Unique ID
   - Type (daily, weekly, recurring)
   - Next trigger time
   - Notification options
   - User ID

### 2. **Background Checking**

The Service Worker runs continuously in the background:

```javascript
// Service Worker checks reminders every minute
setInterval(() => {
  checkReminders()
}, 60000) // 1 minute
```

**What happens:**
1. Service Worker queries IndexedDB for upcoming reminders
2. Checks if any reminder's `nextTriggerTime` has passed
3. Triggers notification if time has arrived
4. Calculates and updates next trigger time

### 3. **Notification Triggering**

When a reminder time arrives:

```javascript
// Service Worker triggers notification
await self.registration.showNotification(title, options)

// Updates reminder for next occurrence
await updateReminderNextTrigger(db, reminder.id, nextTriggerTime)
```

**What happens:**
1. Notification is shown to user
2. Reminder's `nextTriggerTime` is updated
3. `lastTriggered` timestamp is recorded
4. `triggerCount` is incremented

### 4. **Notification Click Handling**

When user clicks a notification:

```javascript
// Service Worker handles click
self.addEventListener('notificationclick', (event) => {
  const url = event.notification.data.url || '/'
  clients.openWindow(url) // Opens app to relevant page
})
```

---

## 🔧 Reminder Types

### Daily Reminders
- Trigger at the same time every day
- Example: Breakfast reminder at 8:00 AM daily

```typescript
{
  type: 'daily',
  options: { data: { time: '08:00' } }
}
```

### Weekly Reminders
- Trigger on specific days of the week
- Example: Workout reminder on weekdays at 6:00 PM

```typescript
{
  type: 'weekly',
  daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  options: { data: { time: '18:00' } }
}
```

### Recurring Reminders
- Trigger at regular intervals within a time window
- Example: Water reminder every 60 minutes from 8 AM to 10 PM

```typescript
{
  type: 'recurring',
  intervalMinutes: 60,
  startTime: '08:00',
  endTime: '22:00'
}
```

---

## 📱 PWA Requirements

For reminders to work when the tab is closed:

1. **Service Worker Must Be Registered**
   ```typescript
   // Already done in registerServiceWorker.ts
   navigator.serviceWorker.register('/sw.js')
   ```

2. **Notification Permission Must Be Granted**
   ```typescript
   await Notification.requestPermission()
   ```

3. **App Should Be Installed as PWA** (recommended)
   - Better background processing
   - More reliable reminder delivery

---

## 🚀 Usage Examples

### Creating Reminders from Settings

```typescript
import { smartReminderService } from '@/services/smartReminders'

// Create reminders from user settings
await smartReminderService.createReminderFromSettings(userId, reminderSettings)
```

### Getting User's Reminders

```typescript
// Get all reminders for a user
const reminders = await smartReminderService.getUserReminders(userId)
```

### Toggling Reminders

```typescript
// Disable a reminder
await smartReminderService.toggleReminder('meal-breakfast-123', false)

// Enable a reminder
await smartReminderService.toggleReminder('meal-breakfast-123', true)
```

### Deleting Reminders

```typescript
// Delete a specific reminder
await smartReminderService.deleteReminder('meal-breakfast-123')

// Delete all reminders for a user
await reminderStorage.deleteUserReminders(userId)
```

---

## 🔍 Debugging

### Check Service Worker Status

1. Open Chrome DevTools → Application → Service Workers
2. Verify service worker is active
3. Check console logs for `[SW]` prefixed messages

### Check IndexedDB

1. Open Chrome DevTools → Application → IndexedDB
2. Look for `NutriScopeReminders` database
3. Check `reminders` object store for stored reminders

### Check Reminder Scheduling

```javascript
// In browser console
const db = await new Promise((resolve) => {
  const request = indexedDB.open('NutriScopeReminders', 1)
  request.onsuccess = () => resolve(request.result)
})

const reminders = await new Promise((resolve) => {
  const transaction = db.transaction(['reminders'], 'readonly')
  const store = transaction.objectStore('reminders')
  const request = store.getAll()
  request.onsuccess = () => resolve(request.result)
})

console.log('Stored reminders:', reminders)
```

### Test Notification

```typescript
// In browser console
await Notification.requestPermission()
new Notification('Test', { body: 'If you see this, notifications work!' })
```

---

## ⚠️ Limitations & Considerations

### Browser Support

- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅
- **Safari**: Limited support (iOS 16.4+)
- **Opera**: Full support ✅

### Service Worker Limitations

- Service Workers can be terminated by the browser
- Reminders may be delayed if device is in power-saving mode
- iOS Safari has stricter background processing limits

### Best Practices

1. **Request Permission Early**: Ask for notification permission during onboarding
2. **Handle Denied Permission**: Gracefully degrade if permission is denied
3. **Test on Real Devices**: Service Worker behavior differs on mobile vs desktop
4. **Monitor Battery Usage**: Frequent checks can impact battery life

---

## 🎨 Smart Features (Future Enhancements)

The current implementation includes hooks for smart features:

### Adaptive Timing
```typescript
// Learn from user behavior
calculateOptimalTime(baseTime, userHistory, adaptive: true)
```

### Quiet Hours
```typescript
// Don't send reminders during sleep hours
isQuietHours(currentTime)
```

### Context Awareness
```typescript
// Adjust reminders based on user activity
interface SmartReminderContext {
  lastMealTime?: Date
  currentActivity?: 'active' | 'idle' | 'sleeping'
}
```

---

## 📝 Migration from Old System

The old reminder system used `setTimeout` which only worked when the tab was open. The new system:

1. **Backwards Compatible**: Falls back to old system if IndexedDB unavailable
2. **Automatic Migration**: Reminders are recreated from settings automatically
3. **No Data Loss**: Old reminders are replaced, not duplicated

---

## 🐛 Troubleshooting

### Reminders Not Triggering

1. **Check Service Worker**: Ensure SW is registered and active
2. **Check Permission**: Verify notification permission is granted
3. **Check IndexedDB**: Ensure reminders are stored correctly
4. **Check Console**: Look for errors in Service Worker console

### Reminders Stop After Closing Tab

- **Expected**: Old system behavior
- **Solution**: Ensure Service Worker is active (check DevTools)
- **Verify**: Reminders should work with new system

### Notifications Not Showing

1. **Check Browser Settings**: Ensure notifications aren't blocked
2. **Check Permission**: Verify `Notification.permission === 'granted'`
3. **Test Notification**: Try manual notification test
4. **Check Quiet Hours**: Ensure not during quiet hours (if implemented)

---

## 📚 Related Files

- `src/services/reminderStorage.ts` - IndexedDB operations
- `src/services/smartReminders.ts` - Smart reminder logic
- `src/components/ReminderScheduler.tsx` - Reminder initialization
- `public/sw.js` - Service Worker implementation
- `src/services/notifications.ts` - Notification API wrapper

---

## ✅ Testing Checklist

- [ ] Service Worker registers successfully
- [ ] Notification permission is requested
- [ ] Reminders are stored in IndexedDB
- [ ] Reminders trigger at correct times
- [ ] Notifications appear when tab is closed
- [ ] Notification clicks open correct page
- [ ] Reminders work after app restart
- [ ] Reminders update when settings change
- [ ] Multiple reminder types work correctly
- [ ] Recurring reminders work correctly

---

## 🚀 Next Steps

1. **Add Smart Features**: Implement adaptive timing and context awareness
2. **Add Snooze**: Allow users to snooze reminders
3. **Add Reminder History**: Track when reminders were triggered
4. **Add Analytics**: Track reminder effectiveness
5. **Add Push Notifications**: Use Web Push API for cross-device reminders

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Verify Service Worker is active
3. Check IndexedDB for stored reminders
4. Test notification permission
5. Review this guide for troubleshooting steps

