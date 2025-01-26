# API Reference

## Location Management

### Create Location

```typescript
async function createLocation(
  name: string,
  address: string,
  latitude: number,
  longitude: number,
  radius: number,
  organizationId: string
): Promise<LocationResult>
```

Parameters:
- `name`: Location name
- `address`: Physical address
- `latitude`: Geographic latitude
- `longitude`: Geographic longitude
- `radius`: Geofence radius in meters
- `organizationId`: Organization identifier

Returns:
- `LocationResult` with created location or error

### Update Location

```typescript
async function updateLocation(
  locationId: string,
  updates: Partial<Location>
): Promise<LocationResult>
```

Parameters:
- `locationId`: Location identifier
- `updates`: Partial location object with fields to update

Returns:
- `LocationResult` with updated location or error

### List Locations

```typescript
async function listLocations(
  organizationId: string
): Promise<LocationResult>
```

Parameters:
- `organizationId`: Organization identifier

Returns:
- `LocationResult` with array of locations or error

## User Assignment Management

### Assign User

```typescript
async function assignUserToLocation(
  userId: string,
  locationId: string,
  startDate: string,
  isPrimary: boolean = false
): Promise<AssignmentResult>
```

Parameters:
- `userId`: User identifier
- `locationId`: Location identifier
- `startDate`: Assignment start date
- `isPrimary`: Whether this is the user's primary location

Returns:
- `AssignmentResult` with assignment details or error

### Get User Locations

```typescript
async function getUserLocations(
  userId: string
): Promise<LocationResult>
```

Parameters:
- `userId`: User identifier

Returns:
- `LocationResult` with user's assigned locations or error

## Geofencing

### Check User Location

```typescript
async function checkUserInGeofence(
  userId: string,
  latitude: number,
  longitude: number
): Promise<boolean>
```

Parameters:
- `userId`: User identifier
- `latitude`: Current latitude
- `longitude`: Current longitude

Returns:
- Boolean indicating if user is within assigned geofence

### Calculate Distance

```typescript
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number
```

Parameters:
- `lat1`: First point latitude
- `lon1`: First point longitude
- `lat2`: Second point latitude
- `lon2`: Second point longitude

Returns:
- Distance in meters between points

## Types

### Location

```typescript
interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### LocationAssignment

```typescript
interface LocationAssignment {
  id: string;
  user_id: string;
  location_id: string;
  start_date: string;
  end_date?: string;
  is_primary: boolean;
}
```

### LocationResult

```typescript
interface LocationResult {
  success: boolean;
  data?: Location | Location[];
  error?: string;
}
```

### AssignmentResult

```typescript
interface AssignmentResult {
  success: boolean;
  data?: LocationAssignment;
  error?: string;
}
```

## Error Handling

All API methods follow this error pattern:

```typescript
try {
  // API operation
  return {
    success: true,
    data: result
  };
} catch (error) {
  return {
    success: false,
    error: error.message
  };
}
```

Common error types:
1. Database errors
2. Validation errors
3. Permission errors
4. Not found errors

## Usage Examples

### Complete Location Management

```typescript
// Create a new location
const newLocation = await createLocation(
  "Main Office",
  "123 Main St",
  37.7749,
  -122.4194,
  100,
  "org-123"
);

// Update location
if (newLocation.success) {
  const updated = await updateLocation(newLocation.data.id, {
    name: "HQ - Main Office",
    radius: 150
  });
}

// List organization locations
const locations = await listLocations("org-123");
```

### User Assignment Workflow

```typescript
// Assign user to location
const assignment = await assignUserToLocation(
  "user-123",
  "loc-456",
  "2025-01-26",
  true
);

// Get user's locations
const userLocations = await getUserLocations("user-123");

// Check if user is in geofence
const isInGeofence = await checkUserInGeofence(
  "user-123",
  37.7749,
  -122.4194
);
```
