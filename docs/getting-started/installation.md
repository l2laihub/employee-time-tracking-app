# Installation Guide

This guide will walk you through the process of setting up ClockFlow for development and production environments.

## Prerequisites

Before installing ClockFlow, ensure you have the following installed:

- Node.js (v18 or higher)
- npm (comes with Node.js)
- Git
- A Supabase account and project

## Development Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/employee-time-tracking-app.git
   cd employee-time-tracking-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```env
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Production Deployment

### Option 1: Netlify Deployment

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Configure Environment Variables**
   - In Netlify dashboard, go to Site settings > Build & deploy > Environment
   - Add the required environment variables

3. **Deploy**
   - Connect your GitHub repository to Netlify
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`

### Option 2: Docker Deployment

1. **Build Docker Image**
   ```bash
   docker build -t clockflow .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 clockflow
   ```

## Post-Installation Steps

1. **Database Setup**
   - Run database migrations
   - Seed initial data if needed

2. **Initial Configuration**
   - Set up admin account
   - Configure company settings
   - Set up departments and job locations

3. **Verification**
   - Verify all features are working
   - Test user authentication
   - Check database connections

## Troubleshooting

If you encounter any issues during installation:

1. Check the [Common Issues](../troubleshooting/common-issues.md) guide
2. Verify all environment variables are set correctly
3. Ensure all prerequisites are installed and up to date
4. Check the application logs for errors

## Next Steps

- Read the [Configuration Guide](./configuration.md)
- Set up your [Development Environment](../development/setup.md)
- Review the [Architecture Overview](./architecture.md)
