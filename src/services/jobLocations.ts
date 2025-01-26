import { supabase } from '../lib/supabase'

export interface Location {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius: number // Geofence radius in meters
  organization_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LocationAssignment {
  id: string
  user_id: string
  location_id: string
  start_date: string
  end_date?: string
  is_primary: boolean
}

export interface LocationResult {
  success: boolean
  data?: Location | Location[]
  error?: string
}

export interface AssignmentResult {
  success: boolean
  data?: LocationAssignment
  error?: string
}

export async function createLocation(
  name: string,
  address: string,
  latitude: number,
  longitude: number,
  radius: number,
  organizationId: string
): Promise<LocationResult> {
  try {
    const { data, error } = await supabase
      .from('job_locations')
      .insert({
        name,
        address,
        latitude,
        longitude,
        radius,
        organization_id: organizationId,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as Location
    };
  } catch (error) {
    console.error('Location creation failed:', error);
    return {
      success: false,
      error: error && typeof error === 'object' && 'message' in error 
        ? error.message 
        : 'Unknown error occurred'
    };
  }
}

export async function updateLocation(
  locationId: string,
  updates: Partial<Location>
): Promise<LocationResult> {
  try {
    const { data, error } = await supabase
      .from('job_locations')
      .update(updates)
      .eq('id', locationId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as Location
    };
  } catch (error) {
    console.error('Location update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function listLocations(organizationId: string): Promise<LocationResult> {
  try {
    const { data, error } = await supabase
      .from('job_locations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) throw error;

    return {
      success: true,
      data: data as Location[]
    };
  } catch (error) {
    console.error('Location listing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function assignUserToLocation(
  userId: string,
  locationId: string,
  startDate: string,
  isPrimary: boolean = false
): Promise<AssignmentResult> {
  try {
    // If this is a primary assignment, update any existing primary assignments to non-primary
    if (isPrimary) {
      await supabase
        .from('location_assignments')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true);
    }

    const { data, error } = await supabase
      .from('location_assignments')
      .insert({
        user_id: userId,
        location_id: locationId,
        start_date: startDate,
        is_primary: isPrimary
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: data as LocationAssignment
    };
  } catch (error) {
    console.error('Location assignment failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function getUserLocations(userId: string): Promise<LocationResult> {
  try {
    const { data, error } = await supabase
      .from('location_assignments')
      .select(`
        location_id,
        is_primary,
        job_locations (*)
      `)
      .eq('user_id', userId)
      .is('end_date', null);

    if (error) throw error;

    const locations = data.map(assignment => ({
      ...assignment.job_locations,
      is_primary: assignment.is_primary
    }));

    return {
      success: true,
      data: locations as Location[]
    };
  } catch (error) {
    console.error('Getting user locations failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function checkUserInGeofence(
  userId: string,
  latitude: number,
  longitude: number
): Promise<boolean> {
  try {
    // Get user's assigned locations
    const locationsResult = await getUserLocations(userId);
    if (!locationsResult.success || !Array.isArray(locationsResult.data)) {
      return false;
    }

    // Check if user is within any assigned location's geofence
    return locationsResult.data.some(location => {
      const distance = calculateDistance(
        latitude,
        longitude,
        location.latitude,
        location.longitude
      );
      return distance <= location.radius;
    });
  } catch (error) {
    console.error('Geofence check failed:', error);
    return false;
  }
}

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
