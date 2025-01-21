# API Endpoints

This document outlines all available API endpoints in the ClockFlow application.

## Authentication

### POST /auth/login
Authenticate a user and receive a JWT token.

```typescript
Request:
{
  "email": string,
  "password": string
}

Response:
{
  "token": string,
  "user": {
    "id": string,
    "email": string,
    "role": string
  }
}
```

### POST /auth/logout
Invalidate the current session.

## Time Entries

### GET /api/time-entries
Get time entries for the authenticated user.

Query Parameters:
- `startDate`: ISO date string
- `endDate`: ISO date string
- `status`: 'pending' | 'approved' | 'rejected'

```typescript
Response:
{
  "entries": [{
    "id": string,
    "startTime": string,
    "endTime": string,
    "jobLocationId": string,
    "status": string,
    "notes": string
  }]
}
```

### POST /api/time-entries
Create a new time entry.

```typescript
Request:
{
  "startTime": string,
  "endTime": string,
  "jobLocationId": string,
  "notes": string
}

Response:
{
  "id": string,
  "startTime": string,
  "endTime": string,
  "status": "pending"
}
```

### PUT /api/time-entries/:id
Update an existing time entry.

```typescript
Request:
{
  "startTime": string,
  "endTime": string,
  "notes": string
}
```

### DELETE /api/time-entries/:id
Delete a time entry.

## PTO Management

### GET /api/pto/balance
Get PTO balance for the authenticated user.

```typescript
Response:
{
  "balances": [{
    "type": string,
    "available": number,
    "used": number,
    "pending": number
  }]
}
```

### POST /api/pto/request
Submit a PTO request.

```typescript
Request:
{
  "startDate": string,
  "endDate": string,
  "type": string,
  "hours": number,
  "notes": string
}

Response:
{
  "id": string,
  "status": "pending"
}
```

### GET /api/pto/requests
Get PTO requests for the authenticated user.

Query Parameters:
- `status`: 'pending' | 'approved' | 'rejected'
- `startDate`: ISO date string
- `endDate`: ISO date string

## Timesheets

### GET /api/timesheets
Get timesheets for the authenticated user.

Query Parameters:
- `startDate`: ISO date string
- `endDate`: ISO date string
- `status`: 'draft' | 'submitted' | 'approved' | 'rejected'

### POST /api/timesheets/submit
Submit a timesheet for approval.

```typescript
Request:
{
  "timesheetId": string,
  "notes": string
}
```

### PUT /api/timesheets/:id/approve
Approve a timesheet (managers only).

```typescript
Request:
{
  "notes": string
}
```

## Job Locations

### GET /api/locations
Get all job locations.

Query Parameters:
- `active`: boolean
- `search`: string

```typescript
Response:
{
  "locations": [{
    "id": string,
    "name": string,
    "address": string,
    "isActive": boolean
  }]
}
```

### POST /api/locations
Create a new job location (admin only).

```typescript
Request:
{
  "name": string,
  "address": string,
  "latitude": number,
  "longitude": number
}
```

## Reports

### GET /api/reports/hours
Get hours worked report.

Query Parameters:
- `startDate`: ISO date string
- `endDate`: ISO date string
- `departmentId`: string (optional)
- `userId`: string (optional)

### GET /api/reports/pto
Get PTO usage report.

Query Parameters:
- `year`: number
- `departmentId`: string (optional)

### GET /api/reports/costs
Get cost analysis report (admin only).

Query Parameters:
- `startDate`: ISO date string
- `endDate`: ISO date string
- `departmentId`: string (optional)

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {}
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Rate Limiting

- Rate limit: 100 requests per minute per IP
- Rate limit headers included in all responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Versioning

- API version included in URL: `/api/v1/`
- Current version: v1
- Deprecation notices sent via response header: `X-API-Deprecation`

## Authentication

- JWT tokens required in Authorization header
- Format: `Authorization: Bearer <token>`
- Tokens expire after 24 hours
- Refresh tokens available via `/auth/refresh`
