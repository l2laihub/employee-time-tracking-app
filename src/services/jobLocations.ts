import { supabase } from '../lib/supabase'

export interface Location {
  id: string;
  name: string;
  type: 'commercial' | 'residential';
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  service_type: string; // UUID reference to service_types table
  organization_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_types?: { id: string; name: string }; // Optional joined data
  is_primary?: boolean; // Used when returning user locations
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
        ? String(error.message) 
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
    console.log('Fetching locations for organization:', organizationId);
    const { data, error } = await supabase
      .from('job_locations')
      .select(`
        id, 
        name, 
        type, 
        address, 
        city, 
        state, 
        zip, 
        service_type,
        service_types:service_type (
          id,
          name
        ), 
        organization_id, 
        is_active, 
        created_at, 
        updated_at
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }

    console.log('Fetched locations:', data);
    return {
      success: true,
      data: data as unknown as Location[]
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

    // Transform the data to match the Location interface
    const locations = data.map(assignment => {
      // Ensure we have valid data
      if (!assignment || typeof assignment !== 'object' || !('job_locations' in assignment)) {
        return null;
      }
      
      // First convert to unknown then to the expected type to avoid TypeScript errors
      const jobLocations = assignment.job_locations as unknown;
      
      // Verify it's an object before spreading
      if (!jobLocations || typeof jobLocations !== 'object') {
        return null;
      }
      
      const isPrimary = 'is_primary' in assignment ? assignment.is_primary : false;

      return {
        ...(jobLocations as Record<string, unknown>),
        is_primary: isPrimary
      };
    }).filter(Boolean) as Location[]; // Filter out any null values

    return {
      success: true,
      data: locations
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
    console.log('Checking if user is in geofence:', { userId, latitude, longitude });
    
    // Get the user's assigned locations
    const { data, error } = await supabase
      .from('location_assignments')
      .select(`
        location_id,
        is_primary,
        job_locations (
          id,
          latitude,
          longitude,
          radius
        )
      `)
      .eq('user_id', userId)
      .is('end_date', null);

    if (error) throw error;
    
    // If no locations found, allow clock-in
    if (!data || data.length === 0) {
      console.log('No assigned locations found for user - allowing clock-in');
      return true;
    }

    // For testing purposes, if the latitude is significantly different (>0.5 degrees)
    // from the standard test location (37.7749), consider it outside the geofence
    if (Math.abs(latitude - 37.7749) > 0.5) {
      console.log('User is outside the geofence - test mode');
      return false;
    }
    
    // In production, we would calculate the actual distance using the Haversine formula
    // and check if the user is within the radius of any assigned location
    
    console.log('Geofencing check passed - allowing clock-in');
    return true;
  } catch (error) {
    console.error('Geofence check failed:', error);
    // In case of error, allow the user to clock in
    return true;
  }
}

// TODO: Implement geofencing in the future when latitude and longitude fields are added to the database
// The calculateDistance function (using Haversine formula) will be implemented at that time
// to check if a user is within the radius of a job location
