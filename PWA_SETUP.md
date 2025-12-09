# PWA Setup Guide

NutriScope is now a Progressive Web App (PWA) that can be installed on devices for a native app-like experience.

## Features

✅ **Installable** - Users can install the app on their home screen  
✅ **Offline Support** - Basic offline functionality with service worker  
✅ **App Icons** - Custom icons for all device sizes  
✅ **Install Prompt** - Smart install prompt that appears when appropriate  
✅ **App Shortcuts** - Quick actions for Log Meal, Log Workout, AI Chat  
✅ **Standalone Mode** - Runs in standalone mode when installed  

## Setup Instructions

### 1. Generate App Icons

The manifest references PNG icons that need to be generated from the SVG favicon:

```bash
# Install sharp (if not already installed)
npm install --save-dev sharp

# Generate icons
node scripts/generate-icons.js
```

This will create icons in the following sizes:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

### 2. Build and Test

```bash
# Build the app
npm run build

# Preview the build
npm run preview
```

### 3. Test PWA Features

#### Desktop (Chrome/Edge)
1. Open DevTools (F12)
2. Go to Application tab
3. Check "Manifest" section
4. Check "Service Workers" section
5. Look for install prompt in address bar

#### Mobile (iOS Safari)
1. Open the app in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. App will appear as standalone app

#### Mobile (Android Chrome)
1. Open the app in Chrome
2. Tap menu (3 dots)
3. Tap "Install app" or "Add to Home Screen"
4. App will install as standalone app

## Files Created

- `public/manifest.json` - PWA manifest configuration
- `public/sw.js` - Service worker for offline support
- `src/utils/registerServiceWorker.ts` - Service worker registration
- `src/components/InstallPrompt.tsx` - Install prompt component
- `scripts/generate-icons.js` - Icon generation script

## Service Worker Features

- **Caching**: Caches app shell and assets
- **Offline Support**: Serves cached content when offline
- **Update Detection**: Detects and notifies about updates
- **Background Sync**: Ready for offline action syncing

## Manifest Configuration

- **Name**: NutriScope - AI-Powered Health & Fitness Tracker
- **Short Name**: NutriScope
- **Display Mode**: Standalone
- **Theme Color**: #0A0A0A (dark theme)
- **Orientation**: Portrait-primary
- **Shortcuts**: Quick actions for common tasks

## Install Prompt Behavior

The install prompt:
- Only appears on supported browsers/devices
- Respects user dismissal (won't show again for 7 days)
- Automatically hides if app is already installed
- Shows appropriate messaging for install vs. add to home screen

## Testing Checklist

- [ ] Icons generated successfully
- [ ] Manifest loads without errors
- [ ] Service worker registers successfully
- [ ] Install prompt appears (when appropriate)
- [ ] App installs correctly
- [ ] App runs in standalone mode
- [ ] Offline functionality works
- [ ] App shortcuts work
- [ ] Theme color matches app design

## Troubleshooting

### Icons not showing
- Ensure icons are generated and in `/public` directory
- Check browser console for 404 errors
- Verify manifest.json icon paths are correct

### Service worker not registering
- Check browser console for errors
- Ensure app is served over HTTPS (or localhost)
- Clear browser cache and reload

### Install prompt not appearing
- Check browser support (Chrome, Edge, Safari iOS)
- Ensure manifest.json is valid
- Check that service worker is registered
- Try in incognito/private mode

### App not installing
- Check manifest.json validity
- Ensure all required icons are present
- Verify service worker is active
- Check browser console for errors

## Production Deployment

For production:
1. Ensure HTTPS is enabled (required for PWA)
2. Generate all icons
3. Test install flow on real devices
4. Verify service worker updates work correctly
5. Test offline functionality

## Future Enhancements

- [ ] Background sync for offline meal/workout logging
- [ ] Push notifications
- [ ] Share target API for sharing content
- [ ] Periodic background sync
- [ ] Advanced caching strategies

