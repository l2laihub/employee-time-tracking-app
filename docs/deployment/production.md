# Production Deployment Guide

This guide covers the process of deploying ClockFlow to production environments.

## Deployment Options

### 1. Netlify Deployment

#### Prerequisites
- Netlify account
- GitHub repository connected to Netlify
- Supabase project set up

#### Steps

1. **Build Configuration**
   Create `netlify.toml`:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"
     
   [build.environment]
     NODE_VERSION = "18"
     
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Environment Variables**
   Configure in Netlify dashboard:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_APP_URL=your_app_url
   ```

3. **Deploy**
   ```bash
   # Manual deployment
   npm run build
   netlify deploy --prod
   
   # Or configure auto-deployment from main branch
   ```

### 2. Docker Deployment

#### Prerequisites
- Docker installed
- Docker registry access
- Production server with Docker

#### Steps

1. **Dockerfile**
   ```dockerfile
   # Build stage
   FROM node:18-alpine as build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   
   # Production stage
   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **Nginx Configuration**
   ```nginx
   server {
     listen 80;
     server_name _;
     root /usr/share/nginx/html;
     index index.html;
     
     location / {
       try_files $uri $uri/ /index.html;
     }
     
     # Cache static assets
     location /assets/ {
       expires 1y;
       add_header Cache-Control "public, no-transform";
     }
   }
   ```

3. **Build and Deploy**
   ```bash
   # Build image
   docker build -t clockflow:latest .
   
   # Run container
   docker run -d -p 80:80 \
     -e VITE_SUPABASE_URL=your_url \
     -e VITE_SUPABASE_ANON_KEY=your_key \
     clockflow:latest
   ```

## Production Checklist

### 1. Performance Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2015',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          components: ['@/components'],
        }
      }
    }
  }
});
```

### 2. Security Measures

1. **Headers Configuration**
   ```nginx
   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
   add_header X-Frame-Options "SAMEORIGIN" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header Content-Security-Policy "default-src 'self';" always;
   ```

2. **SSL Configuration**
   ```nginx
   server {
     listen 443 ssl http2;
     ssl_certificate /etc/nginx/ssl/cert.pem;
     ssl_certificate_key /etc/nginx/ssl/key.pem;
     ssl_protocols TLSv1.2 TLSv1.3;
     ssl_ciphers HIGH:!aNULL:!MD5;
   }
   ```

### 3. Monitoring Setup

1. **Application Monitoring**
   ```typescript
   // src/monitoring/setup.ts
   import * as Sentry from "@sentry/react";
   
   export function setupMonitoring() {
     if (process.env.NODE_ENV === 'production') {
       Sentry.init({
         dsn: process.env.VITE_SENTRY_DSN,
         environment: 'production',
         tracesSampleRate: 0.1
       });
     }
   }
   ```

2. **Performance Monitoring**
   ```typescript
   // src/monitoring/performance.ts
   export function trackPageLoad() {
     const navigation = performance.getEntriesByType('navigation')[0];
     const metrics = {
       ttfb: navigation.responseStart - navigation.requestStart,
       fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
       lcp: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime
     };
     
     // Send metrics to monitoring service
   }
   ```

### 4. Backup Strategy

```bash
#!/bin/bash
# backup.sh

# Database backup
pg_dump $DATABASE_URL > backup.sql

# Upload to secure storage
aws s3 cp backup.sql s3://backups/$(date +%Y-%m-%d)/

# Retain for 30 days
aws s3 ls s3://backups/ | while read -r line;
do
  createDate=`echo $line|awk {'print $1" "$2'}`
  olderThan30Days=$(date -d "$createDate 30 days" +%s)
  if [ $(date +%s) -gt $olderThan30Days ];
  then
    aws s3 rm "s3://backups/$line"
  fi
done
```

## Deployment Process

### 1. Pre-deployment

```bash
# Run tests
npm run test
npm run test:e2e

# Build check
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

### 2. Database Migration

```bash
# Create migration
npm run migration:create

# Apply migration
npm run migration:up

# Verify migration
npm run migration:status
```

### 3. Deployment Steps

```bash
# 1. Tag release
git tag v1.0.0
git push origin v1.0.0

# 2. Build application
npm run build

# 3. Deploy to staging
npm run deploy:staging

# 4. Run smoke tests
npm run test:smoke

# 5. Deploy to production
npm run deploy:prod
```

### 4. Post-deployment

```bash
# Verify deployment
curl -I https://app.clockflow.com

# Monitor errors
tail -f /var/log/nginx/error.log

# Check application logs
docker logs clockflow-app
```

## Rollback Procedure

```bash
# 1. Revert to previous version
git checkout v1.0.0

# 2. Rebuild
npm run build

# 3. Deploy previous version
npm run deploy:prod

# 4. Revert database if needed
npm run migration:down

# 5. Verify rollback
npm run test:smoke
```

## Maintenance Mode

```nginx
# maintenance.html
server {
  location / {
    if (-f $document_root/maintenance.html) {
      return 503;
    }
  }
  
  error_page 503 @maintenance;
  location @maintenance {
    rewrite ^(.*)$ /maintenance.html break;
  }
}
```

## Production Support

### 1. Logging

```typescript
// src/utils/logger.ts
export const logger = {
  info: (message: string, context = {}) => {
    if (process.env.NODE_ENV === 'production') {
      // Send to logging service
      LogService.info(message, {
        ...context,
        timestamp: new Date().toISOString(),
        environment: 'production'
      });
    }
  },
  error: (error: Error, context = {}) => {
    if (process.env.NODE_ENV === 'production') {
      // Send to error tracking
      Sentry.captureException(error, {
        extra: context
      });
    }
  }
};
```

### 2. Health Checks

```typescript
// src/health/check.ts
export async function healthCheck() {
  try {
    // Check database connection
    await supabase.from('health').select('status').single();
    
    // Check API endpoints
    await fetch('/api/health');
    
    return { status: 'healthy' };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}
```

### 3. Monitoring Alerts

```typescript
// src/monitoring/alerts.ts
export const alertThresholds = {
  errorRate: 0.01, // 1% error rate
  responseTime: 1000, // 1 second
  cpuUsage: 80, // 80% CPU
  memoryUsage: 85 // 85% memory
};

export function checkThresholds(metrics: Metrics) {
  if (metrics.errorRate > alertThresholds.errorRate) {
    notify('High Error Rate Alert');
  }
  
  if (metrics.responseTime > alertThresholds.responseTime) {
    notify('High Response Time Alert');
  }
}
```
