# Employee Management System - Setup Guide

This guide will help you set up the Employee Management and Payroll System on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control
- A modern web browser (Chrome, Firefox, Safari, Edge)

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "employee-management-system")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

### 1.2 Enable Authentication
1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### 1.3 Create Firestore Database
1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database
5. Click "Done"

### 1.4 Get Firebase Configuration
1. Go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click the web icon (</>) to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

## Step 2: Project Setup

### 2.1 Clone and Install Dependencies
```bash
# Navigate to the project directory
cd my-app

# Install dependencies
npm install
```

### 2.2 Environment Configuration
1. Create a `.env.local` file in the root directory
2. Add your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2.3 Firebase Security Rules
In your Firebase Console, go to Firestore Database > Rules and update the rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Admin and Manager can access all collections
    match /{document=**} {
      allow read, write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager');
    }
  }
}
```

## Step 3: Run the Application

### 3.1 Start Development Server
```bash
npm run dev
```

### 3.2 Access the Application
Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Step 4: Initial Setup

### 4.1 Create Admin Account
1. Click "Sign Up" on the login page
2. Fill in your details:
   - Full Name: Your name
   - Email: Your email address
   - Role: Admin
   - Password: Choose a strong password
3. Click "Create Account"

### 4.2 First Login
1. Use your email and password to log in
2. You'll be redirected to the admin dashboard

### 4.3 Add Employees
1. Navigate to "Employees" in the sidebar
2. Click "Add Employee"
3. Fill in employee details:
   - Employee ID: Unique identifier
   - Personal information
   - Salary structure
   - Address and emergency contact
4. Click "Save"

### 4.4 Mark Attendance
1. Go to "Attendance" in the sidebar
2. Select a date
3. Mark attendance for each employee
4. Click "Save Attendance"

### 4.5 Process Payroll
1. Navigate to "Payroll" in the sidebar
2. Select month and year
3. Click "Process Payroll"
4. Review the generated payroll records

## Step 5: Production Deployment

### 5.1 Vercel Deployment (Recommended)
1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com/)
3. Import your GitHub repository
4. Add environment variables in Vercel dashboard
5. Deploy

### 5.2 Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase hosting
firebase init hosting

# Build the application
npm run build

# Deploy
firebase deploy
```

## Troubleshooting

### Common Issues

#### 1. Firebase Configuration Errors
- Ensure all environment variables are correctly set
- Check that your Firebase project is properly configured
- Verify that Authentication and Firestore are enabled

#### 2. Build Errors
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)
- Clear Next.js cache: `rm -rf .next`

#### 3. Authentication Issues
- Verify Firebase Authentication is enabled
- Check that Email/Password provider is enabled
- Ensure security rules allow user creation

#### 4. Database Access Issues
- Check Firestore security rules
- Verify database location and permissions
- Ensure proper indexing for queries

### Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Review Firebase Console logs
3. Check the application logs in the terminal
4. Refer to the README.md for additional information

## Security Considerations

### Development
- Use test mode for Firestore during development
- Keep environment variables secure
- Don't commit `.env.local` to version control

### Production
- Set up proper Firestore security rules
- Enable Firebase App Check
- Configure proper authentication methods
- Set up monitoring and logging
- Regular security audits

## Next Steps

After successful setup:

1. **Customize the application** to match your organization's needs
2. **Add more employees** and configure their salary structures
3. **Set up regular payroll processing** schedules
4. **Configure email notifications** for payroll processing
5. **Implement additional features** like leave management
6. **Set up backup and monitoring** procedures

## Support

For additional support:
- Check the project documentation
- Review the code comments
- Open an issue in the project repository
- Contact the development team

---

**Note**: This is a development setup. For production deployment, ensure you follow security best practices and configure proper authentication, authorization, and data protection measures. 