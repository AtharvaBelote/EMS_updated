# EMS Mobile - Employee Management System Mobile App

A React Native mobile application for employees to access their EMS account on the go.

## Features

### 🔐 Authentication
- Secure login with Employee ID and password
- Employee-only access (admin and managers use web portal)

### 📊 Dashboard
- Personal statistics overview
- Monthly salary information
- Attendance percentage
- Quick access to key features

### 👤 Profile
- View personal information
- Salary structure details
- Contact information
- Additional employee details

### 📅 Attendance
- View attendance history
- Attendance statistics (present, absent, late, half-day)
- Attendance percentage tracking
- Recent attendance records

### 🏖️ Leave Management
- View leave balance for all leave types
- Apply for leave (Casual, Sick, Earned)
- Track leave application status
- View leave history

### 💰 Salary Slips
- View all generated salary slips
- Detailed breakdown of earnings and deductions
- Monthly salary history
- Period-wise organization
- Easy access to salary information

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Navigate to the EMS-Mobile directory:
```bash
cd EMS-Mobile
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your Firebase configuration:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Running the App

Start the development server:
```bash
npm start
```

Then choose your platform:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Project Structure

```
EMS-Mobile/
├── src/
│   ├── config/
│   │   └── firebase.ts          # Firebase configuration
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication context
│   ├── navigation/
│   │   └── AppNavigator.tsx     # Navigation setup
│   ├── screens/
│   │   ├── LoginScreen.tsx      # Login screen
│   │   ├── DashboardScreen.tsx  # Dashboard
│   │   ├── ProfileScreen.tsx    # Profile view
│   │   ├── AttendanceScreen.tsx # Attendance tracking
│   │   └── LeaveScreen.tsx      # Leave management
│   └── types/
│       └── index.ts             # TypeScript types
├── App.tsx                      # Main app component
├── app.json                     # Expo configuration
└── package.json                 # Dependencies

```

## Technologies Used

- **React Native** - Mobile framework
- **Expo** - Development platform
- **React Navigation** - Navigation library
- **React Native Paper** - UI component library
- **Firebase** - Backend services (Auth, Firestore)
- **TypeScript** - Type safety

## Features by Screen

### Login Screen
- Employee ID input
- Password input with show/hide toggle
- Error handling with user-friendly messages
- Loading states

### Dashboard Screen
- Welcome header with avatar
- Monthly salary display
- Attendance percentage
- Quick stats cards
- Attendance summary
- Personal information

### Profile Screen
- Employee details
- Salary structure breakdown
- Contact information
- Address details
- ESIC and UAN numbers

### Attendance Screen
- Attendance statistics
- Present/Absent/Late/Half-day counts
- Attendance percentage
- Detailed attendance history
- Color-coded status chips

### Leave Screen
- Leave balance for all types
- Apply for leave form
- Leave application history
- Status tracking (pending/approved/rejected)
- Leave type selection

## Security

- Employee-only access enforced at login
- Firebase authentication
- Secure data fetching with user context
- Role-based access control

## Future Enhancements

- [ ] Push notifications for leave approvals
- [ ] Salary slip download
- [ ] Biometric authentication
- [ ] Offline mode support
- [ ] Dark mode
- [ ] Multi-language support

## Support

For issues or questions, please contact your system administrator or refer to the main EMS documentation.

## License

This project is part of the Employee Management System and follows the same license as the main project.
