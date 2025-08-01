# Employee Management and Payroll System

A comprehensive HR management application built with Next.js 15, Material-UI, and Firebase. This system provides role-based access control, employee management, attendance tracking, salary management, and payroll processing capabilities.

## Features

### 🔐 Authentication & User Management
- Firebase Authentication integration
- Role-based access control (Admin, Manager, Employee)
- Secure login using email/password
- User registration for Admin/Manager roles
- Password management and account recovery

### 👥 Employee Management
- Complete CRUD operations for employee records
- Dynamic table with search, filter, and pagination
- Bulk operations (import/export from Excel/CSV)
- Employee profile management with documents
- Salary structure configuration

### 📊 Dashboard System
- Role-specific dashboards
- Real-time statistics and analytics
- Quick action buttons
- Recent activity tracking

### 📅 Attendance Management
- Daily attendance tracking
- Bulk attendance marking
- Attendance history and reports
- Leave management integration

### 💰 Salary & Payroll System
- Complex salary structure (Base, HRA, TA, DA, Bonuses, Deductions)
- Tax regime selection (Old/New)
- Monthly payroll processing
- Salary slip generation (PDF)
- Bulk salary operations

### 📈 Reporting & Analytics
- Comprehensive audit trail
- Export capabilities (CSV, Excel, PDF)
- Data visualization
- Employee statistics

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **Material-UI (MUI)** - UI components and theming
- **Tailwind CSS** - Additional styling
- **TypeScript** - Type safety
- **React Hook Form** - Form management
- **Yup** - Form validation

### Backend
- **Firebase Firestore** - NoSQL database
- **Firebase Authentication** - User management
- **Real-time data synchronization**

### Additional Libraries
- **jsPDF** - PDF generation for salary slips
- **XLSX** - Excel file import/export
- **date-fns** - Date manipulation

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd my-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Get your Firebase configuration

4. **Environment Configuration**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. **Firebase Security Rules**
   Set up Firestore security rules:
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

6. **Run the development server**
```bash
npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard page
│   ├── employees/         # Employee management page
│   ├── login/            # Login page
│   └── register/         # Registration page
├── components/           # React components
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard components
│   ├── employees/       # Employee management components
│   └── layout/          # Layout components
├── contexts/            # React contexts
├── lib/                 # Utility libraries
└── types/               # TypeScript type definitions
```

## Usage

### Initial Setup
1. Register as an Admin or Manager
2. Log in to access the dashboard
3. Start adding employees and configuring the system

### Role Permissions

#### Admin
- Full system access
- User management
- System settings
- All employee operations
- Payroll processing

#### Manager
- Employee management
- Attendance tracking
- Payroll access
- Reports and analytics

#### Employee
- Personal information view
- Attendance marking
- Salary slip access

## Database Collections

### Core Collections
- `users` - User accounts and roles
- `employees` - Employee records
- `attendance` - Daily attendance records
- `salary_structures` - Salary configurations
- `payroll` - Monthly payroll records
- `salary_slips` - Generated salary slips
- `audit_logs` - System audit trail
- `bulk_operations` - Bulk operation history

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Build: `npm run build`
5. Deploy: `firebase deploy`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository.

## Roadmap

- [ ] Mobile responsiveness improvements
- [ ] Email notifications
- [ ] Advanced reporting features
- [ ] Multi-language support
- [ ] Integration with accounting software
- [ ] Offline support
- [ ] Advanced analytics dashboard
