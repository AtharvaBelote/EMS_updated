# EMS Mobile - Setup Guide

This guide will help you set up and run the EMS Mobile application.

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (version 18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Expo CLI** (optional but recommended)
   ```bash
   npm install -g expo-cli
   ```

4. **Development Environment**
   - For iOS: Mac with Xcode installed
   - For Android: Android Studio with Android SDK
   - Or use Expo Go app on your physical device

## Step 1: Install Dependencies

Navigate to the EMS-Mobile directory and install dependencies:

```bash
cd EMS-Mobile
npm install
```

## Step 2: Configure Firebase

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Firebase configuration:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. Get these values from your Firebase Console:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project (same as web app)
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - If you haven't added a web app, click "Add app" and select Web
   - Copy the configuration values

## Step 3: Verify Firebase Setup

Ensure your Firebase project has:

1. **Authentication enabled**
   - Email/Password provider enabled
   - Users with role 'employee' created

2. **Firestore Database**
   - Collections: users, employees, attendance, leaveApplications, leaveBalances
   - Proper security rules (same as web app)

3. **Security Rules** (if not already set)
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       match /employees/{employeeId} {
         allow read: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'employee' &&
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.employeeId == employeeId;
       }
       
       match /attendance/{attendanceId} {
         allow read: if request.auth != null &&
           resource.data.employeeId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.employeeId;
       }
       
       match /leaveApplications/{leaveId} {
         allow read, write: if request.auth != null &&
           resource.data.employeeId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.employeeId;
       }
       
       match /leaveBalances/{balanceId} {
         allow read: if request.auth != null &&
           resource.data.employeeId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.employeeId;
       }
     }
   }
   ```

## Step 4: Run the Application

### Option A: Using Expo Go (Easiest)

1. Install Expo Go on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Start the development server:
   ```bash
   npm start
   ```

3. Scan the QR code:
   - iOS: Use Camera app
   - Android: Use Expo Go app

### Option B: Using iOS Simulator (Mac only)

1. Install Xcode from Mac App Store

2. Start the app:
   ```bash
   npm run ios
   ```

### Option C: Using Android Emulator

1. Install Android Studio

2. Set up an Android Virtual Device (AVD)

3. Start the app:
   ```bash
   npm run android
   ```

## Step 5: Test the Application

1. **Login**
   - Use an employee's Employee ID (not email)
   - Use the password set for that employee
   - Only employees can login (admins/managers should use web portal)

2. **Navigate**
   - Dashboard: View your stats
   - Attendance: Check attendance history
   - Leave: Apply for leave and view balance
   - Profile: View personal information

## Troubleshooting

### Issue: "Cannot connect to Firebase"
- Check your `.env` file has correct values
- Ensure Firebase project is active
- Verify internet connection

### Issue: "Login failed"
- Verify the user exists in Firebase Authentication
- Check the user has role 'employee' in Firestore
- Ensure employeeId field matches in users collection

### Issue: "No data showing"
- Check Firestore security rules
- Verify data exists in Firestore collections
- Check console for error messages

### Issue: "Expo Go not connecting"
- Ensure phone and computer are on same WiFi network
- Try restarting the development server
- Check firewall settings

### Issue: "Module not found"
- Delete node_modules: `rm -rf node_modules`
- Clear npm cache: `npm cache clean --force`
- Reinstall: `npm install`

## Development Tips

1. **Hot Reload**: Changes to code will automatically reload the app

2. **Debug Menu**:
   - iOS: Cmd + D
   - Android: Cmd + M (Mac) or Ctrl + M (Windows/Linux)

3. **Console Logs**: View in terminal where you ran `npm start`

4. **Clear Cache**:
   ```bash
   npm start -- --clear
   ```

## Building for Production

### iOS (requires Mac and Apple Developer account)
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

For detailed build instructions, see [Expo documentation](https://docs.expo.dev/distribution/building-standalone-apps/).

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [Firebase Documentation](https://firebase.google.com/docs)

## Support

For issues specific to the mobile app:
1. Check the console for error messages
2. Verify Firebase configuration
3. Ensure you're using the latest dependencies
4. Contact your system administrator

## Next Steps

After successful setup:
1. Test all features thoroughly
2. Customize the app theme if needed
3. Add company branding (logo, colors)
4. Configure push notifications (optional)
5. Set up analytics (optional)
