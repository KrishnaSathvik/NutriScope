# Apple Watch Integration Plan for NutriScope

## 📋 Executive Summary

**Current State:** NutriScope is a web-based application (React + TypeScript) with no native mobile apps or wearable integrations.

**Challenge:** Apple Watch integration requires a native iOS app because:
- HealthKit API is iOS-only (no web API available)
- WatchConnectivity framework requires native iOS/watchOS apps
- Apple Watch apps must be built with Swift/SwiftUI

**Solution:** Create a companion iOS app that bridges Apple Watch/HealthKit data to your existing web backend.

---

## 🎯 Integration Architecture

### **Option 1: Companion iOS App (Recommended)**

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Apple Watch   │◄───────►│   iOS App        │◄───────►│  Web Backend     │
│   (watchOS)     │         │   (Swift/SwiftUI)│         │  (Supabase API)  │
│                 │         │                  │         │                  │
│ - Quick Logging │         │ - HealthKit      │         │ - Data Storage   │
│ - View Progress │         │ - WatchConnectivity│       │ - Analytics     │
│ - Notifications │         │ - API Sync       │         │ - AI Features    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │   HealthKit      │
                            │   (iOS System)   │
                            │                  │
                            │ - Steps          │
                            │ - Heart Rate     │
                            │ - Workouts       │
                            │ - Active Energy  │
                            └──────────────────┘
```

### **Option 2: Web-to-Native Bridge (Alternative)**

Use a service like:
- **Capacitor** (Ionic) - Convert web app to native iOS
- **React Native** - Rewrite key features as native
- **PWA with iOS App Wrapper** - Minimal native wrapper

**Recommendation:** Option 1 is cleaner and more maintainable for your use case.

---

## 📱 Implementation Plan

### **Phase 1: iOS App Foundation (Weeks 1-3)**

#### **1.1 Project Setup**
- [ ] Create new Xcode project (iOS app)
- [ ] Set up SwiftUI project structure
- [ ] Configure App ID and provisioning profiles
- [ ] Set up authentication (match web app auth flow)
- [ ] Integrate Supabase iOS SDK

#### **1.2 Core Features**
- [ ] User authentication (email/password, matching web)
- [ ] API integration with existing Supabase backend
- [ ] Data sync service (meals, workouts, water, weight)
- [ ] Basic UI matching web app design

#### **1.3 HealthKit Integration**
```swift
// Request HealthKit permissions
let healthStore = HKHealthStore()

let typesToRead: Set<HKObjectType> = [
    HKObjectType.quantityType(forIdentifier: .stepCount)!,
    HKObjectType.quantityType(forIdentifier: .heartRate)!,
    HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
    HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
    HKObjectType.workoutType(),
    HKObjectType.quantityType(forIdentifier: .bodyMass)!,
]

healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
    // Handle authorization
}
```

**Data to Sync from HealthKit:**
- ✅ Steps (automatic)
- ✅ Active Energy Burned (calories from activity)
- ✅ Workouts (type, duration, calories)
- ✅ Heart Rate (optional, for insights)
- ✅ Weight (if synced to HealthKit)
- ✅ Distance (walking/running)

---

### **Phase 2: Apple Watch App (Weeks 4-6)**

#### **2.1 Watch App Setup**
- [ ] Add watchOS target to iOS project
- [ ] Configure WatchConnectivity framework
- [ ] Set up shared data models
- [ ] Design watch UI (SwiftUI)

#### **2.2 Watch Features**

**Quick Actions:**
- [ ] Log water intake (quick buttons: 250ml, 500ml, 750ml)
- [ ] Log meal (voice input or quick templates)
- [ ] Start/stop workout
- [ ] View today's progress (calories, protein, water)

**Watch Face Complications:**
- [ ] Daily calorie progress
- [ ] Water intake progress
- [ ] Steps count
- [ ] Streak counter

**Notifications:**
- [ ] Meal reminders
- [ ] Water reminders
- [ ] Workout reminders
- [ ] Goal achievement notifications

#### **2.3 WatchConnectivity Implementation**
```swift
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
    var session: WCSession?
    
    func activateSession() {
        if WCSession.isSupported() {
            session = WCSession.default
            session?.delegate = self
            session?.activate()
        }
    }
    
    // Send data from iOS to Watch
    func sendToWatch(_ data: [String: Any]) {
        session?.sendMessage(data, replyHandler: nil)
    }
    
    // Receive data from Watch
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        // Handle data from watch (e.g., water logged, meal logged)
    }
}
```

---

### **Phase 3: Data Synchronization (Weeks 7-8)**

#### **3.1 HealthKit → iOS App → Web Backend**

**Workflow:**
1. iOS app reads HealthKit data periodically
2. Transforms HealthKit data to NutriScope format
3. Syncs to Supabase backend via existing API
4. Web app displays synced data automatically

**Implementation:**
```swift
// Sync steps and active energy
func syncHealthKitData() {
    let calendar = Calendar.current
    let now = Date()
    let startOfDay = calendar.startOfDay(for: now)
    
    // Read steps
    let stepsType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
    let stepsQuery = HKStatisticsQuery(
        quantityType: stepsType,
        quantitySamplePredicate: HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: now,
            options: .strictStartDate
        ),
        options: .cumulativeSum
    ) { query, result, error in
        if let steps = result?.sumQuantity()?.doubleValue(for: HKUnit.count()) {
            // Sync to backend
            self.syncStepsToBackend(steps: Int(steps))
        }
    }
    
    healthStore.execute(stepsQuery)
}

// Sync workouts
func syncWorkouts() {
    let workoutType = HKObjectType.workoutType()
    let predicate = HKQuery.predicateForWorkouts(with: .greaterThanOrEqualTo, duration: 0)
    
    let query = HKSampleQuery(
        sampleType: workoutType,
        predicate: predicate,
        limit: HKObjectQueryNoLimit,
        sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
    ) { query, samples, error in
        // Transform and sync workouts to backend
        self.syncWorkoutsToBackend(samples: samples)
    }
    
    healthStore.execute(query)
}
```

#### **3.2 Backend API Extensions**

**New Endpoints Needed:**
```typescript
// api/healthkit/sync.ts
POST /api/healthkit/sync
{
  "steps": number,
  "active_energy_burned": number,
  "workouts": Array<{
    type: string,
    duration: number,
    calories_burned: number,
    start_date: string,
    end_date: string
  }>,
  "date": string
}
```

**Database Schema Updates:**
```sql
-- Add healthkit_sync table
CREATE TABLE healthkit_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER DEFAULT 0,
  active_energy_burned INTEGER DEFAULT 0,
  heart_rate_avg DECIMAL(5,2),
  distance_walking_running DECIMAL(10,2),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Update exercises table to support HealthKit workouts
ALTER TABLE exercises ADD COLUMN healthkit_workout_id TEXT;
ALTER TABLE exercises ADD COLUMN source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'healthkit', 'watch'));
```

---

### **Phase 4: Watch App Features (Weeks 9-10)**

#### **4.1 Quick Logging**

**Water Logging:**
```swift
struct WaterLogView: View {
    @StateObject var connectivity = WatchConnectivityManager()
    
    var body: some View {
        VStack {
            Text("Log Water")
            HStack {
                Button("250ml") { logWater(250) }
                Button("500ml") { logWater(500) }
                Button("750ml") { logWater(750) }
            }
        }
    }
    
    func logWater(_ amount: Int) {
        connectivity.sendToWatch([
            "action": "log_water",
            "amount": amount
        ])
    }
}
```

**Meal Logging:**
- Voice input via SiriKit
- Quick meal templates
- Send to iOS app → backend

#### **4.2 Progress View**
- Today's calories (consumed/burned)
- Protein progress
- Water progress
- Steps count

#### **4.3 Workout Tracking**
- Start/stop workout from watch
- Real-time heart rate display
- Auto-sync to HealthKit and backend

---

### **Phase 5: Testing & Polish (Weeks 11-12)**

#### **5.1 Testing**
- [ ] Test HealthKit permissions flow
- [ ] Test data sync accuracy
- [ ] Test watch-to-iOS communication
- [ ] Test iOS-to-backend sync
- [ ] Test edge cases (no internet, watch disconnected)
- [ ] Test on physical devices (iPhone + Apple Watch)

#### **5.2 User Experience**
- [ ] Smooth onboarding flow
- [ ] Clear permission requests
- [ ] Error handling and retry logic
- [ ] Background sync optimization
- [ ] Battery optimization

---

## 🔧 Technical Requirements

### **Development Tools**
- **Xcode 15+** (required for watchOS development)
- **iOS 17+** deployment target
- **watchOS 10+** deployment target
- **Swift 5.9+**
- **SwiftUI** (for UI)

### **Dependencies**
```swift
// Package.swift or Podfile
dependencies: [
    .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0"),
    // HealthKit is built-in
    // WatchConnectivity is built-in
]
```

### **Permissions Required (Info.plist)**
```xml
<key>NSHealthShareUsageDescription</key>
<string>NutriScope needs access to your health data to sync workouts, steps, and activity.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>NutriScope needs permission to write workout data to HealthKit.</string>
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Apple Watch (watchOS)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Quick Log    │  │ View Progress│  │ Notifications│     │
│  │ - Water      │  │ - Calories    │  │ - Reminders  │     │
│  │ - Meals      │  │ - Protein     │  │ - Goals      │     │
│  │ - Workouts   │  │ - Water       │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                    WatchConnectivity                         │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    iOS App (SwiftUI)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ HealthKit    │  │ Data Sync    │  │ Auth         │     │
│  │ - Read Steps │  │ - Transform  │  │ - Supabase   │     │
│  │ - Read Energy│  │ - Validate    │  │ - JWT        │     │
│  │ - Read Workouts│ │ - Queue      │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                    Supabase API                             │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Backend (PostgreSQL)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ exercises    │  │ daily_logs   │  │ healthkit_   │     │
│  │ - workouts   │  │ - calories   │  │ sync         │     │
│  │ - calories   │  │ - macros     │  │ - steps      │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                    Real-time Subscriptions                   │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Web App (React + TypeScript)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Dashboard    │  │ Analytics    │  │ AI Chat      │     │
│  │ - Auto-update│  │ - Charts     │  │ - Insights   │     │
│  │ - Real-time  │  │ - Trends     │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│         Data automatically syncs via Supabase                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Features to Implement

### **1. Automatic Data Sync**
- ✅ Steps from HealthKit → daily_logs
- ✅ Active energy burned → calories_burned
- ✅ Workouts → exercises table
- ✅ Weight (if synced to HealthKit) → weight_logs

### **2. Watch Quick Actions**
- ✅ Log water (250ml, 500ml, 750ml, 1000ml buttons)
- ✅ Log meal (voice or quick templates)
- ✅ Start workout (with auto-tracking)
- ✅ View today's progress

### **3. Watch Complications**
- ✅ Calorie progress (consumed/target)
- ✅ Water progress (ml/goal)
- ✅ Steps count
- ✅ Streak counter

### **4. Notifications**
- ✅ Meal reminders (breakfast, lunch, dinner)
- ✅ Water reminders (hourly)
- ✅ Workout reminders
- ✅ Goal achievements

### **5. Background Sync**
- ✅ Periodic HealthKit sync (every 15-30 minutes)
- ✅ Queue failed syncs for retry
- ✅ Handle offline scenarios

---

## 📝 Implementation Checklist

### **iOS App**
- [ ] Project setup and authentication
- [ ] HealthKit integration and permissions
- [ ] Supabase API integration
- [ ] Data sync service
- [ ] Background sync scheduler
- [ ] Error handling and retry logic

### **Watch App**
- [ ] Watch app project setup
- [ ] WatchConnectivity implementation
- [ ] Quick logging UI (water, meals)
- [ ] Progress view
- [ ] Complications
- [ ] Notifications

### **Backend**
- [ ] HealthKit sync API endpoint
- [ ] Database schema updates
- [ ] Data validation and transformation
- [ ] Conflict resolution (manual vs HealthKit data)

### **Testing**
- [ ] Unit tests for data transformation
- [ ] Integration tests for sync flow
- [ ] Watch app testing on physical device
- [ ] Performance testing
- [ ] Battery impact testing

---

## ⚠️ Challenges & Considerations

### **1. Data Conflicts**
**Problem:** User logs workout manually in web app, but also has HealthKit workout for same time.

**Solution:**
- Use `source` field to track data origin
- Implement conflict resolution (prefer manual, or merge)
- Show both sources in UI with indicators

### **2. Privacy & Permissions**
**Problem:** Users may be hesitant to grant HealthKit permissions.

**Solution:**
- Clear explanation of why permissions are needed
- Granular permission requests (only request what's needed)
- Show value proposition (automatic sync, less manual entry)

### **3. Battery Impact**
**Problem:** Frequent HealthKit queries can drain battery.

**Solution:**
- Batch syncs (every 15-30 minutes, not continuously)
- Use background app refresh efficiently
- Only sync when app is active or recently used

### **4. Offline Support**
**Problem:** Watch/iOS app may be offline when logging.

**Solution:**
- Queue actions locally
- Sync when connection restored
- Show sync status in UI

### **5. Web App Compatibility**
**Problem:** Web app needs to handle HealthKit-synced data gracefully.

**Solution:**
- Add `source` indicator in UI
- Allow manual override if needed
- Show sync timestamp

---

## 🚀 Quick Start Guide

### **Step 1: Create iOS Project**
```bash
# In Xcode:
1. File → New → Project
2. Choose "iOS" → "App"
3. Name: "NutriScope iOS"
4. Interface: SwiftUI
5. Language: Swift
6. Check "Include Watch App"
```

### **Step 2: Add HealthKit Capability**
```
1. Select iOS target
2. Signing & Capabilities
3. Click "+ Capability"
4. Add "HealthKit"
```

### **Step 3: Install Dependencies**
```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/supabase/supabase-swift", from: "2.0.0")
]
```

### **Step 4: Request HealthKit Permissions**
```swift
import HealthKit

let healthStore = HKHealthStore()

func requestHealthKitPermissions() {
    guard HKHealthStore.isHealthDataAvailable() else { return }
    
    let typesToRead: Set<HKObjectType> = [
        HKObjectType.quantityType(forIdentifier: .stepCount)!,
        HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
        HKObjectType.workoutType(),
    ]
    
    healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
        // Handle result
    }
}
```

### **Step 5: Sync Data to Backend**
```swift
func syncStepsToBackend(steps: Int) async {
    let url = URL(string: "https://your-api.com/api/healthkit/sync")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
    
    let body: [String: Any] = [
        "steps": steps,
        "date": ISO8601DateFormatter().string(from: Date())
    ]
    
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    let (_, _) = try? await URLSession.shared.data(for: request)
}
```

---

## 📚 Resources & Documentation

### **Apple Documentation**
- [HealthKit Framework](https://developer.apple.com/documentation/healthkit)
- [WatchConnectivity Framework](https://developer.apple.com/documentation/watchconnectivity)
- [Creating a Watch App](https://developer.apple.com/documentation/watchkit)
- [SwiftUI for watchOS](https://developer.apple.com/documentation/swiftui)

### **Third-Party Libraries**
- [Supabase Swift SDK](https://github.com/supabase/supabase-swift)
- [HealthKit Helper Libraries](https://github.com/search?q=healthkit+swift)

### **Tutorials**
- [Apple Watch Development Guide](https://developer.apple.com/watchos/)
- [HealthKit Integration Tutorial](https://www.raywenderlich.com/459-healthkit-tutorial-with-swift-getting-started)

---

## 💰 Cost Considerations

### **Development Costs**
- **iOS Developer Account:** $99/year (required for App Store)
- **Development Time:** ~12 weeks (1 developer)
- **Testing Devices:** iPhone + Apple Watch (if not available)

### **Ongoing Costs**
- **App Store Review:** Free (but takes 1-2 weeks)
- **Maintenance:** Ongoing updates for iOS/watchOS updates
- **Server Costs:** Minimal (uses existing Supabase backend)

---

## 🎯 Success Metrics

### **User Adoption**
- % of iOS users who enable HealthKit sync
- % of users who use watch app
- Daily active users on watch app

### **Data Quality**
- Accuracy of synced data vs manual entry
- Sync success rate
- Conflict resolution effectiveness

### **User Engagement**
- Watch app usage frequency
- Quick logging actions per day
- Notification engagement rate

---

## 🔄 Alternative Approaches

### **Option A: Third-Party Service**
Use services like:
- **Strava API** (if users sync workouts to Strava)
- **MyFitnessPal API** (if users use MFP)
- **Google Fit API** (for Android users)

**Pros:** Faster implementation, no native app needed  
**Cons:** Requires users to use third-party apps, less control

### **Option B: PWA with iOS App Wrapper**
Convert web app to iOS app using:
- **Capacitor** (Ionic)
- **Cordova**

**Pros:** Reuse existing web code  
**Cons:** Limited HealthKit access, performance issues

### **Option C: Wait for Web APIs**
Apple may eventually provide HealthKit web APIs (unlikely in near future).

**Recommendation:** Option 1 (Native iOS App) is the best long-term solution.

---

## ✅ Next Steps

1. **Review this plan** with your team
2. **Decide on approach** (recommended: Native iOS app)
3. **Set up development environment** (Xcode, Apple Developer account)
4. **Create iOS project** and basic structure
5. **Implement Phase 1** (iOS app foundation)
6. **Iterate** based on user feedback

---

## 📞 Support & Questions

If you have questions about this implementation plan, consider:
- Reviewing Apple's official documentation
- Joining Apple Developer Forums
- Consulting with iOS/watchOS developers
- Starting with a minimal MVP and iterating

---

**Last Updated:** January 2025  
**Estimated Timeline:** 12 weeks (1 developer, full-time)  
**Complexity:** Medium-High (requires native iOS/watchOS development)

