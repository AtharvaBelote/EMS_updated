# EMS Mobile App Integration Guide

This document explains how the EMS Mobile app integrates with the main EMS web application.

## Overview

The EMS Mobile app is a React Native application built with Expo that provides employees with mobile access to their EMS account. It shares the same Firebase backend as the web application, ensuring data consistency across platforms.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Firebase Backend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Authentication│  │  Firestore   │  │   Storage    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           │                    │                    │
    ┌──────┴──────┐      ┌─────┴─────┐      ┌──────┴──────┐
    │             │      │           │      │             │
┌───▼────┐   ┌───▼────┐ │  ┌────────▼──────▼────┐       │
│  Web   │   │ Mobile │ │  │   Admin Portal      │       │
│  App   │   │  App   │ │  │   (Web Only)        │       │
│(Next.js)│  │(Expo)  │ │  └─────────────────────┘       │
└────────┘   └────────┘ │                                 │
                        │                                 │
                   Employee                           Admin/Manager
                   Access                             Access
```

## Shared Components

### 1. Firebase Configuration
Both apps use the same Firebase project with identical configuration:

**Web App** (`src/lib/firebase.ts`):
```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  // ...
};
```

**Mobile App** (`src/config/firebase.ts`):
```typescript
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  // ...
};
```

### 2. Data Models
Both apps share the same TypeScript interfaces for data consistency:

- `User` - Authentication and user data
- `Employee` - Employee information
- `Attendance` - Attendance records
- `LeaveApplication` - Leave requests
- `LeaveBalance` - Leave balance tracking
- `Notification` - System notifications

### 3. Authentication Flow
Both apps use Firebase Authentication with the same login logic:

1. User enters Employee ID and password
2. Query Firestore for user by `userId` or `employeeId`
3. Authenticate with Firebase Auth using email
4. Update `lastLoginAt` timestamp
5. Store user session

**Key Difference**: Mobile app restricts access to employees only, while web app supports all roles.

## Feature Comparison

| Feature | Web App | Mobile App | Notes |
|---------|---------|------------|-------|
| **Authentication** | ✅ All roles | ✅ Employees only | Mobile enforces employee-only access |
| **Dashboard** | ✅ Role-specific | ✅ Employee view | Shows personal stats and salary |
| **Profile** | ✅ Full profile | ✅ View only | Mobile is read-only |
| **Attendance** | ✅ Mark & view | ✅ View only | Employees view their history |
| **Leave Management** | ✅ Full CRUD | ✅ Apply & view | Employees can apply and track |
| **Salary Slips** | ✅ Generate & view | 🔄 Coming soon | Planned feature |
| **Employee Management** | ✅ Admin/Manager | ❌ Not available | Admin-only feature |
| **Payroll Processing** | ✅ Admin only | ❌ Not available | Admin-only feature |
| **Reports** | ✅ All roles | 🔄 Coming soon | Planned feature |

## Data Synchronization

### Real-time Updates
Both apps use Firestore's real-time listeners for instant data synchronization:

- Changes made in web app are immediately visible in mobile app
- Leave applications submitted via mobile appear instantly in web admin panel
- Attendance marked by admin is immediately visible to employees

### Offline Support
- **Web App**: Limited offline support via browser caching
- **Mobile App**: Currently requires internet connection (offline mode planned)

## Security

### Authentication
- Both apps use Firebase Authentication
- Session management handled by Firebase SDK
- Tokens automatically refreshed

### Authorization
- Role-based access control enforced at Firestore level
- Security rules prevent unauthorized access
- Mobile app validates employee role at login

### Data Access
**Employee Access (Mobile & Web)**:
```javascript
// Can only read their own data
match /employees/{employeeId} {
  allow read: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.employeeId == employeeId;
}
```

**Admin Access (Web Only)**:
```javascript
// Can access all company data
match /employees/{employeeId} {
  allow read, write: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## API Endpoints

Both apps interact directly with Firebase services:

### Firestore Collections
- `users` - User authentication data
- `employees` - Employee profiles
- `attendance` - Attendance records
- `leaveApplications` - Leave requests
- `leaveBalances` - Leave balance tracking
- `notifications` - System notifications
- `companies` - Company information
- `managers` - Manager profiles
- `payroll` - Payroll records (web only)

### Common Queries

**Fetch Employee Data**:
```typescript
const employeeQuery = query(
  collection(db, 'employees'),
  where('employeeId', '==', currentUser.employeeId)
);
```

**Fetch Attendance**:
```typescript
const attendanceQuery = query(
  collection(db, 'attendance'),
  where('employeeId', '==', currentUser.employeeId)
);
```

**Apply for Leave**:
```typescript
await addDoc(collection(db, 'leaveApplications'), {
  employeeId: currentUser.employeeId,
  leaveTypeId: 'casual',
  startDate: new Date(),
  endDate: new Date(),
  status: 'pending',
  // ...
});
```

## Development Workflow

### Setting Up Both Apps

1. **Clone Repository**:
```bash
git clone <repository-url>
cd EMS_updated
```

2. **Setup Web App**:
```bash
npm install
cp .env.example .env.local
# Configure Firebase credentials
npm run dev
```

3. **Setup Mobile App**:
```bash
cd EMS-Mobile
npm install
cp .env.example .env
# Configure Firebase credentials (same project)
npm start
```

### Testing Integration

1. **Create Test Employee** (via web app):
   - Login as admin
   - Create employee with test data
   - Note the Employee ID and password

2. **Test Mobile Login**:
   - Open mobile app
   - Login with Employee ID
   - Verify data matches web app

3. **Test Data Sync**:
   - Mark attendance in web app
   - Refresh mobile app
   - Verify attendance appears

4. **Test Leave Application**:
   - Apply for leave in mobile app
   - Check web admin panel
   - Approve/reject from web
   - Verify status updates in mobile

## Deployment

### Web App (Vercel)
```bash
# Build and deploy
npm run build
vercel deploy
```

### Mobile App

**iOS** (requires Mac + Apple Developer account):
```bash
expo build:ios
# Submit to App Store
```

**Android**:
```bash
expo build:android
# Submit to Play Store
```

## Troubleshooting

### Common Issues

**Issue**: Data not syncing between apps
- **Solution**: Check Firebase security rules, verify both apps use same project

**Issue**: Mobile login fails but web works
- **Solution**: Ensure user has `employeeId` field and role is 'employee'

**Issue**: Attendance not showing in mobile
- **Solution**: Verify `employeeId` matches in attendance records

**Issue**: Leave application not appearing in web
- **Solution**: Check Firestore console for the document, verify companyId

## Best Practices

### For Administrators

1. **User Creation**: Always set `employeeId` field when creating employees
2. **Role Assignment**: Ensure employees have role 'employee' in Firestore
3. **Data Consistency**: Use the same field names across all platforms
4. **Testing**: Test new features in both web and mobile before deployment

### For Developers

1. **Type Safety**: Use shared TypeScript types for consistency
2. **Error Handling**: Implement proper error handling in both apps
3. **Loading States**: Show loading indicators during data fetches
4. **Offline Handling**: Plan for offline scenarios
5. **Security**: Never expose sensitive data in mobile app

## Future Enhancements

### Planned Features
- [ ] Offline mode support
- [ ] Push notifications
- [ ] Salary slip download
- [ ] Biometric authentication
- [ ] Dark mode
- [ ] Performance reports
- [ ] Document upload
- [ ] Chat/messaging

### Integration Improvements
- [ ] GraphQL API layer
- [ ] Shared component library
- [ ] Unified authentication service
- [ ] Real-time notifications
- [ ] Analytics integration

## Support

For integration issues:
1. Check Firebase Console for errors
2. Verify security rules are correct
3. Ensure both apps use same Firebase project
4. Check network connectivity
5. Review console logs in both apps

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Next.js Documentation](https://nextjs.org/docs)

## Contributing

When adding features:
1. Update both web and mobile apps if applicable
2. Maintain type consistency
3. Update security rules
4. Test on both platforms
5. Update documentation

---

**Last Updated**: 2026-04-04
**Version**: 1.0.0
