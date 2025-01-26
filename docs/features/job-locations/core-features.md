# Core Features

## Location Management

### Creating Locations

```typescript
const result = await createLocation(
  name,
  address,
  latitude,
  longitude,
  radius,
  organizationId
);
```

Features:
- Automatic geofence creation
- Organization-based isolation
- Validation of coordinates
- Duplicate address detection

### Updating Locations

```typescript
const updateResult = await updateLocation(locationId, {
  name: 'Updated Name',
  radius: 150
});
```

Capabilities:
- Partial updates
- Geofence modification
- Address validation
- History tracking

### Listing Locations

```typescript
const locations = await listLocations(organizationId);
```

Features:
- Organization filtering
- Active location filtering
- Pagination support
- Sorting options

## User Assignment Management

### Assigning Users

```typescript
const assignment = await assignUserToLocation(
  userId,
  locationId,
  startDate,
  isPrimary
);
```

Features:
- Primary location handling
- Date-based assignments
- Multiple assignments per user
- Assignment validation

### Retrieving Assignments

```typescript
const userLocations = await getUserLocations(userId);
```

Capabilities:
- Current assignments
- Historical assignments
- Primary location identification
- Assignment metadata

## Geofencing

### Location Checking

```typescript
const isWithinGeofence = await checkUserInGeofence(
  userId,
  currentLatitude,
  currentLongitude
);
```

Features:
- Real-time location validation
- Multiple geofence support
- Distance calculation
- Accuracy considerations

### Distance Calculation

```typescript
const distance = calculateDistance(
  location1.latitude,
  location1.longitude,
  location2.latitude,
  location2.longitude
);
```

Capabilities:
- Haversine formula implementation
- Earth curvature consideration
- Meter-based precision
- Performance optimization

## Time Tracking Integration

### Clock-In Validation

```typescript
// Validate location before clock-in
if (await checkUserInGeofence(userId, lat, lng)) {
  // Allow clock-in
}
```

Features:
- Location verification
- Policy enforcement
- Error handling
- Audit logging

### Location History

```typescript
// Track location changes during shift
await recordLocationCheck({
  userId,
  locationId,
  timestamp,
  isWithinGeofence
});
```

Capabilities:
- Location tracking
- Compliance monitoring
- Report generation
- Data analysis
