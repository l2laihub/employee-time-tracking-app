# Development Setup Guide

This guide will help you set up your development environment for the ClockFlow application.

## Prerequisites

1. **Node.js and npm**
   - Install Node.js (v18 or higher)
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **Git**
   - Install Git
   - Configure Git:
     ```bash
     git config --global user.name "Your Name"
     git config --global user.email "your.email@example.com"
     ```

3. **Code Editor**
   - Install Visual Studio Code
   - Recommended extensions:
     - ESLint
     - Prettier
     - Tailwind CSS IntelliSense
     - TypeScript Vue Plugin (Volar)
     - GitLens

4. **Database**
   - Create a Supabase account
   - Create a new Supabase project
   - Note down your project URL and anon key

## Initial Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/employee-time-tracking-app.git
   cd employee-time-tracking-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy example environment file
   cp .env.example .env

   # Edit .env with your values
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   ```bash
   # Apply database migrations
   npm run supabase:migrate

   # Seed initial data (if needed)
   npm run supabase:seed
   ```

## Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```
   - Access the app at `http://localhost:3000`
   - Hot reload enabled
   - Error overlay active

2. **Running Tests**
   ```bash
   # Unit tests
   npm run test

   # Watch mode
   npm run test:watch

   # Coverage report
   npm run test:coverage

   # E2E tests
   npm run test:e2e
   ```

3. **Code Linting and Formatting**
   ```bash
   # Lint code
   npm run lint

   # Fix linting issues
   npm run lint:fix

   # Format code
   npm run format
   ```

4. **Type Checking**
   ```bash
   # Check types
   npm run type-check

   # Watch mode
   npm run type-check:watch
   ```

## Development Tools

### VS Code Configuration

1. **Workspace Settings**
   Create `.vscode/settings.json`:
   ```json
   {
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     },
     "typescript.tsdk": "node_modules/typescript/lib"
   }
   ```

2. **Launch Configuration**
   Create `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "chrome",
         "request": "launch",
         "name": "Launch Chrome",
         "url": "http://localhost:3000",
         "webRoot": "${workspaceFolder}"
       }
     ]
   }
   ```

### Browser DevTools

1. **React Developer Tools**
   - Install Chrome extension
   - Enable Components tab
   - Enable Profiler

2. **Redux DevTools**
   - Install Chrome extension
   - Monitor state changes
   - Time travel debugging

## Git Workflow

1. **Branch Naming**
   ```
   feature/description
   bugfix/description
   hotfix/description
   ```

2. **Commit Messages**
   ```
   feat: add time entry approval workflow
   fix: correct overtime calculation
   docs: update API documentation
   ```

3. **Pull Request Process**
   - Create feature branch
   - Make changes
   - Run tests
   - Create pull request
   - Request review

## Common Development Tasks

### Adding New Features

1. **Create Feature Files**
   ```bash
   # Create feature directory
   mkdir -p src/features/newFeature

   # Create necessary files
   touch src/features/newFeature/index.ts
   touch src/features/newFeature/NewFeature.tsx
   touch src/features/newFeature/NewFeature.test.tsx
   ```

2. **Update Routes**
   ```typescript
   // src/routes/index.tsx
   import NewFeature from '@/features/newFeature';

   const routes = [
     {
       path: '/new-feature',
       element: <NewFeature />
     }
   ];
   ```

### Database Changes

1. **Create Migration**
   ```bash
   npm run supabase:migration:create my_migration_name
   ```

2. **Apply Migration**
   ```bash
   npm run supabase:migrate
   ```

3. **Reset Database**
   ```bash
   npm run supabase:reset
   ```

## Troubleshooting

### Common Issues

1. **Node Version Mismatch**
   ```bash
   nvm use
   # or
   fnm use
   ```

2. **Dependencies Issues**
   ```bash
   # Clear npm cache
   npm cache clean --force

   # Remove node_modules
   rm -rf node_modules

   # Reinstall dependencies
   npm install
   ```

3. **Database Connection**
   - Check environment variables
   - Verify Supabase project status
   - Check network connectivity

### Getting Help

1. **Documentation**
   - Check project documentation
   - Review Supabase docs
   - Search GitHub issues

2. **Team Communication**
   - Use Slack channel
   - Tag appropriate team members
   - Provide error details

## Performance Testing

1. **Lighthouse**
   ```bash
   # Install Lighthouse
   npm install -g lighthouse

   # Run audit
   lighthouse http://localhost:3000
   ```

2. **React Profiler**
   - Use React DevTools Profiler
   - Record rendering
   - Analyze performance

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` files
   - Use `.env.example` for templates
   - Rotate keys regularly

2. **Dependencies**
   ```bash
   # Check for vulnerabilities
   npm audit

   # Fix vulnerabilities
   npm audit fix
   ```

## Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Preview Build**
   ```bash
   npm run preview
   ```

3. **Deploy**
   ```bash
   # Deploy to staging
   npm run deploy:staging

   # Deploy to production
   npm run deploy:prod
   ```
