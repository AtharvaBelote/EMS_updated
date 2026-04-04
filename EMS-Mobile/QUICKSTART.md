# Quick Start Guide - EMS Mobile

Get up and running with EMS Mobile in 5 minutes!

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd EMS-Mobile
npm install
```

### 2. Configure Firebase
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your Firebase credentials
# (Get these from Firebase Console > Project Settings)
```

### 3. Start the App
```bash
npm start
```

### 4. Open on Your Device
- **Phone**: Install Expo Go app and scan the QR code
- **iOS Simulator**: Press `i` in terminal
- **Android Emulator**: Press `a` in terminal

## 📱 Test Login

Use any employee credentials from your EMS system:
- **Employee ID**: (e.g., EMP001)
- **Password**: (employee's password)

**Note**: Only employees can login to the mobile app. Admins and managers should use the web portal.

## ✅ What You Get

- 📊 **Dashboard**: View your stats and salary info
- 📅 **Attendance**: Track your attendance history
- 🏖️ **Leave**: Apply for leave and check balance
- 👤 **Profile**: View your personal information

## 🔧 Common Commands

```bash
# Start development server
npm start

# Start with cache cleared
npm start -- --clear

# Run on iOS
npm run ios

# Run on Android
npm run android

# Install new dependencies
npm install
```

## 🐛 Quick Troubleshooting

**Can't connect?**
- Check your `.env` file has correct Firebase credentials
- Ensure phone and computer are on same WiFi

**Login fails?**
- Verify employee exists in Firebase
- Check employee has role 'employee' in Firestore
- Ensure employeeId field is set correctly

**No data showing?**
- Check Firestore security rules
- Verify data exists in collections
- Look for errors in terminal

## 📚 Need More Help?

- See [SETUP.md](./SETUP.md) for detailed setup instructions
- See [README.md](./README.md) for full feature documentation
- Check the main EMS documentation

## 🎯 Next Steps

1. Test all features with your employee account
2. Customize app theme and branding
3. Deploy to App Store / Play Store (optional)

Happy coding! 🎉
