# Employee Time Tracking App

A comprehensive employee time tracking application built with React, TypeScript, and Supabase. This application helps organizations manage employee time entries, PTO requests, job locations, and generate various reports for better workforce management.

## Features

- 👥 **User Role Management**
  - Admin and Employee dashboards
  - Role-based access control

- ⏱️ **Time Tracking**
  - Time entry management
  - Timesheet submission and review
  - Job/Location selection
  - Status tracking

- 📊 **Reporting**
  - Cost analysis reports
  - Employee hours reports
  - Performance tracking
  - Job completion reports
  - Export capabilities

- 📍 **Job Location Management**
  - Location tracking
  - Bulk import functionality
  - Location-based assignments

- 🏖️ **PTO Management**
  - Vacation and Sick Leave tracking
  - Automatic balance calculations based on:
    - Years of service (Vacation)
    - Hours worked (Sick Leave)
  - Beginning balance import support
  - First year pro-rated vacation hours
  - PTO request submission and approval workflow
  - Detailed balance history
  - Import/Export capabilities

- 👥 **Employee Management**
  - Employee profiles with PTO settings
  - Department and role management
  - Bulk import with PTO balances
  - Start date tracking for PTO calculations

## Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend/Database**: Supabase
- **Routing**: React Router v6
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Code Quality**: ESLint

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- Git

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/employee-time-tracking-app.git
   cd employee-time-tracking-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality

## Deployment

### Netlify Deployment

1. Connect your repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18 (or higher)

3. Environment variables:
   - Add the following environment variables in Netlify's dashboard:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. Client-side routing:
   - A `_redirects` file is included in the `public` directory to handle client-side routing
   - This ensures that all routes are properly handled in production
   - The file contains: `/* /index.html 200`

### Other Deployment Platforms

When deploying to other platforms, ensure:
1. Node.js version 18 or higher is used
2. All environment variables are properly configured
3. Client-side routing is handled appropriately
4. The build output directory (`dist`) is served

## Project Structure

```
src/
├── components/           # React components
│   ├── dashboard/       # Dashboard-related components
│   ├── employees/       # Employee management components
│   ├── job-locations/   # Location management components
│   ├── pto/            # PTO-related components
│   ├── reports/        # Reporting components
│   ├── time-entry/     # Time tracking components
│   └── timesheets/     # Timesheet components
├── contexts/           # React contexts
├── lib/               # Utilities and helpers
│   ├── constants/     # Constants and enums
│   └── hooks/        # Custom React hooks
├── pages/            # Page components
└── types/           # TypeScript type definitions
```

## Development Guidelines

### Code Style

- Use TypeScript for all new files
- Follow ESLint rules configured in the project
- Use functional components with hooks
- Implement proper type definitions for all props and state
- Use async/await for asynchronous operations

### Component Structure

- Keep components focused and single-responsibility
- Use custom hooks for reusable logic
- Implement proper error handling
- Use proper TypeScript types for props and state

### State Management

- Use React Context for global state
- Utilize local state for component-specific data
- Implement proper loading and error states

### Routing

- Define routes in `src/components/routes/AppRoutes.tsx`
- Use protected routes for authenticated content
- Implement proper route guards

### API Integration

- Use Supabase client for database operations
- Implement proper error handling
- Use TypeScript types for API responses

## Database Setup

The application uses Supabase as the backend with a PostgreSQL database. The schema includes Row Level Security (RLS) policies for secure data access.

### Initial Setup

1. Create a new Supabase project at [https://supabase.com](https://supabase.com)
2. Configure your environment variables in `.env`:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Run the migrations found in `supabase/migrations/`

### Database Schema

#### Tables

1. **users**
   - `id` (uuid, primary key)
   - `email` (text, unique)
   - `first_name` (text)
   - `last_name` (text)
   - `role` (enum: admin, manager, employee)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

2. **job_locations**
   - `id` (uuid, primary key)
   - `name` (text)
   - `address` (text)
   - `city` (text)
   - `state` (text)
   - `zip` (text)
   - `is_active` (boolean)
   - `created_by` (uuid, references users)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

3. **time_entries**
   - `id` (uuid, primary key)
   - `user_id` (uuid, references users)
   - `job_location_id` (uuid, references job_locations)
   - `clock_in` (timestamptz)
   - `clock_out` (timestamptz)
   - `notes` (text)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

4. **timesheet_submissions**
   - `id` (uuid, primary key)
   - `user_id` (uuid, references users)
   - `start_date` (date)
   - `end_date` (date)
   - `status` (text)
   - `notes` (text)
   - `reviewed_by` (uuid, references users)
   - `reviewed_at` (timestamptz)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

### Security Policies

The database implements Row Level Security (RLS) with the following policies:

1. **Users Table**
   - Users can read their own data
   - Admins and managers can read all users

2. **Job Locations Table**
   - All authenticated users can read active job locations
   - Admins and managers can manage job locations

3. **Time Entries Table**
   - Users can read and create their own time entries
   - Admins and managers can read all time entries

4. **Timesheet Submissions Table**
   - Users can manage their own timesheet submissions
   - Admins and managers can manage all timesheet submissions

### Initial Data

The database comes with initial test users:
- Admin user: admin@timetracker.com
- Employee user: employee@timetracker.com

### Database Extensions

- UUID extension for generating unique identifiers

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests and ensure code quality
4. Submit a pull request

## License

This project is private and proprietary.

## PTO Rules

### Vacation Time
- First year: Pro-rated 40 hours (5 days)
- Second year onwards: 80 hours (10 days)
- Beginning balance can be imported for transfers
- Balance calculated as: Beginning Balance + Accrued - Used

### Sick Leave
- Accrues at 1 hour per 40 hours worked
- Beginning balance can be imported
- Balance calculated as: Beginning Balance + Accrued - Used

### Import Template Format
The employee import template supports the following fields:
```csv
first_name,last_name,email,phone,role,department,start_date,sick_leave_beginning_balance,vacation_beginning_balance
```

Example:
```csv
John,Doe,john@example.com,123-456-7890,employee,Sales,2024-01-15,0,0
Jane,Smith,jane@example.com,123-456-7891,manager,Engineering,2023-12-01,24,8
