# EMS Mobile - Feature Documentation

Complete feature documentation for the EMS Mobile application.

## 🎯 Core Features

### 1. Authentication

#### Login
- **Employee ID Login**: Employees login using their Employee ID (not email)
- **Password Authentication**: Secure password-based authentication
- **Role Validation**: Only employees can access the mobile app
- **Session Management**: Automatic session handling with Firebase
- **Error Handling**: User-friendly error messages

**Security Features**:
- Password visibility toggle
- Secure credential storage
- Automatic session timeout
- Failed login attempt tracking

### 2. Dashboard

#### Overview
The dashboard provides a comprehensive view of employee information and statistics.

**Components**:
- **Welcome Header**: Personalized greeting with avatar
- **Quick Stats Cards**:
  - Monthly salary display
  - Attendance percentage
  - Efficiency score
- **Attendance Summary**: Present/Absent/Late counts
- **Personal Information**: Email, mobile, department

**Data Displayed**:
- Current month salary
- Total attendance days
- Present days count
- Absent days count
- Late days count
- Attendance percentage
- Employee ID
- Contact information

**Interactions**:
- Pull to refresh
- Auto-refresh on app focus
- Navigation to other screens

### 3. Profile

#### Personal Information
Complete employee profile with all relevant details.

**Sections**:

**Header**:
- Large avatar with initials
- Full name
- Employee ID
- Active status badge

**Personal Details**:
- Email address
- Mobile number
- Department
- Joining date

**Salary Structure**:
- Basic salary
- Dearness Allowance (DA)
- House Rent Allowance (HRA)
- Transport Allowance (TA)
- Total CTC
- Tax regime (Old/New)

**Additional Information**:
- Address
- ESIC number
- UAN number
- Custom fields (if any)

**Features**:
- Read-only view (updates via web portal)
- Formatted currency display
- Date formatting
- Pull to refresh

### 4. Attendance

#### Attendance Tracking
View complete attendance history and statistics.

**Summary Statistics**:
- Overall attendance percentage
- Total present days
- Total absent days
- Late arrivals
- Half-day records

**Attendance History**:
- Date-wise records
- Status indicators (color-coded)
- Recent 20 records displayed
- Sorted by date (newest first)

**Status Types**:
- ✅ **Present**: Green badge
- ❌ **Absent**: Red badge
- ⚠️ **Late**: Orange badge
- 🕐 **Half-Day**: Blue badge

**Features**:
- Pull to refresh
- Color-coded status chips
- Scrollable history
- Date formatting (DD MMM YYYY)

### 5. Leave Management

#### Leave Balance
View available leave balance for all leave types.

**Leave Types**:
- **Casual Leave (CL)**: 12 days/year
- **Sick Leave (SL)**: 8 days/year
- **Earned Leave (EL)**: 15 days/year (carry forward enabled)

**Balance Display**:
- Allocated days
- Used days
- Pending applications
- Remaining balance
- Color-coded by leave type

#### Apply for Leave
Submit leave applications directly from mobile.

**Application Form**:
- Leave type selection
- Start date
- End date
- Reason (optional)
- Automatic days calculation

**Validation**:
- Check available balance
- Prevent overlapping dates
- Validate date range
- Required field checks

#### Leave History
Track all leave applications and their status.

**Application Details**:
- Leave type
- Date range
- Number of days
- Application status
- Applied date
- Reason
- Approval/Rejection details

**Status Types**:
- 🟡 **Pending**: Awaiting approval
- ✅ **Approved**: Approved by admin
- ❌ **Rejected**: Rejected with reason
- ⚪ **Cancelled**: Cancelled by employee

**Features**:
- Real-time status updates
- Sorted by application date
- Color-coded status badges
- Detailed view of each application

## 🎨 User Interface

### Design System

**Color Palette**:
- Primary: `#2196f3` (Blue)
- Secondary: `#1976d2` (Dark Blue)
- Success: `#4caf50` (Green)
- Error: `#f44336` (Red)
- Warning: `#ff9800` (Orange)
- Background: `#f5f5f5` (Light Gray)

**Typography**:
- Headlines: Material Design 3
- Body text: System default
- Monospace: For IDs and codes

**Components**:
- Material Design 3 (React Native Paper)
- Consistent spacing (8px grid)
- Rounded corners (8px)
- Elevation for cards
- Smooth animations

### Navigation

**Bottom Tab Navigation**:
1. 🏠 **Dashboard**: Home screen
2. 📅 **Attendance**: Attendance tracking
3. 🏖️ **Leave**: Leave management
4. 👤 **Profile**: Personal profile

**Navigation Features**:
- Active tab highlighting
- Icon + label
- Smooth transitions
- Back button support

## 📱 Platform Support

### iOS
- iOS 13.0 and above
- iPhone and iPad support
- Native iOS components
- iOS-specific gestures

### Android
- Android 5.0 (API 21) and above
- Phone and tablet support
- Material Design components
- Android-specific features

### Web (via Expo)
- Progressive Web App support
- Responsive design
- Browser compatibility

## 🔒 Security Features

### Authentication Security
- Secure password storage
- Token-based authentication
- Automatic token refresh
- Session timeout handling

### Data Security
- Encrypted data transmission
- Secure API calls
- Role-based access control
- Data validation

### Privacy
- No data stored locally (except session)
- Secure logout
- No sensitive data in logs
- GDPR compliant

## ⚡ Performance

### Optimization
- Lazy loading of screens
- Image optimization
- Efficient data fetching
- Minimal re-renders

### Caching
- Firebase SDK caching
- Image caching
- Query result caching

### Network
- Efficient API calls
- Batch requests where possible
- Error retry logic
- Offline detection

## 🔄 Data Synchronization

### Real-time Updates
- Firestore real-time listeners
- Instant data sync
- Automatic refresh
- Pull-to-refresh support

### Conflict Resolution
- Last-write-wins strategy
- Timestamp-based updates
- Server-side validation

## 📊 Analytics (Planned)

### User Analytics
- Screen views
- Feature usage
- Session duration
- User engagement

### Performance Metrics
- App load time
- Screen render time
- API response time
- Error rates

## 🌐 Internationalization (Planned)

### Language Support
- English (default)
- Hindi
- Regional languages

### Localization
- Date formats
- Currency formats
- Number formats
- Time zones

## ♿ Accessibility

### Features
- Screen reader support
- High contrast mode
- Font scaling
- Touch target sizes (44x44 minimum)

### WCAG Compliance
- Color contrast ratios
- Keyboard navigation
- Focus indicators
- Alt text for images

## 🔔 Notifications (Planned)

### Push Notifications
- Leave approval/rejection
- Salary slip generation
- Attendance reminders
- System announcements

### In-App Notifications
- Real-time updates
- Badge counts
- Notification center

## 📥 Offline Support (Planned)

### Offline Features
- View cached data
- Queue actions
- Sync when online
- Offline indicator

### Data Persistence
- Local database
- Encrypted storage
- Automatic sync

## 🧪 Testing

### Unit Tests
- Component testing
- Function testing
- State management

### Integration Tests
- API integration
- Navigation flow
- Data flow

### E2E Tests
- User workflows
- Critical paths
- Cross-platform testing

## 📈 Future Enhancements

### Phase 1 (Q2 2026)
- [ ] Salary slip download
- [ ] Push notifications
- [ ] Biometric authentication
- [ ] Dark mode

### Phase 2 (Q3 2026)
- [ ] Offline mode
- [ ] Performance reports
- [ ] Document upload
- [ ] Multi-language support

### Phase 3 (Q4 2026)
- [ ] Chat/messaging
- [ ] Team collaboration
- [ ] Advanced analytics
- [ ] Widget support

## 🐛 Known Issues

### Current Limitations
- Requires internet connection
- No offline data access
- Limited to employee role
- No document upload yet

### Workarounds
- Use web portal for admin tasks
- Ensure stable internet connection
- Contact admin for profile updates

## 📞 Support

### Getting Help
1. Check in-app help section
2. Contact system administrator
3. Email: support@ems.com
4. Phone: +91-XXXX-XXXXXX

### Reporting Issues
- Use in-app feedback
- Email with screenshots
- Include error messages
- Provide steps to reproduce

## 📚 Resources

### Documentation
- [Setup Guide](./SETUP.md)
- [Quick Start](./QUICKSTART.md)
- [Integration Guide](../MOBILE_APP_INTEGRATION.md)

### External Links
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [Firebase Documentation](https://firebase.google.com/docs)

---

**Version**: 1.0.0  
**Last Updated**: April 4, 2026  
**Maintained by**: EMS Development Team
