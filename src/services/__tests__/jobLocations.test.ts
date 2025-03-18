import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createLocation,
  updateLocation,
  listLocations,
  assignUserToLocation,
  getUserLocations,
  checkUserInGeofence,
  Location,
  LocationAssignment
} from '../jobLocations'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase')

describe('job locations service', () => {
  const mockLocation: Location = {
    id: 'loc-123',
    name: 'Main Office',
    address: '123 Main St, City, State',
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 100,
    organization_id: 'org-123',
    is_active: true,
    created_at: '2025-01-26T08:00:00Z',
    updated_at: '2025-01-26T08:00:00Z'
  }

  const mockAssignment: LocationAssignment = {
    id: 'assign-123',
    user_id: 'user-123',
    location_id: 'loc-123',
    start_date: '2025-01-26',
    is_primary: true
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('createLocation', () => {
    it('creates a new location successfully', async () => {
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockLocation,
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await createLocation(
        'Main Office',
        '123 Main St, City, State',
        37.7749,
        -122.4194,
        100,
        'org-123'
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockLocation)
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        name: 'Main Office',
        address: '123 Main St, City, State',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 100,
        organization_id: 'org-123',
        is_active: true
      })
    })

    it('handles creation failure', async () => {
      const mockError = { message: 'Database error' };
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await createLocation(
        'Main Office',
        '123 Main St, City, State',
        37.7749,
        -122.4194,
        100,
        'org-123'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe(mockError.message)
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        name: 'Main Office',
        address: '123 Main St, City, State',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 100,
        organization_id: 'org-123',
        is_active: true
      })
    })
  })

  describe('updateLocation', () => {
    it('updates location successfully', async () => {
      const updates = {
        name: 'Updated Office',
        radius: 150
      }

      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockLocation, ...updates },
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await updateLocation('loc-123', updates)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ ...mockLocation, ...updates })
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(updates)
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'loc-123')
    })
  })

  describe('listLocations', () => {
    it('lists all active locations for organization', async () => {
      const mockResponse = {
        data: [mockLocation],
        error: null
      };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      };

      // Mock the second eq call to return the response
      mockQueryBuilder.eq.mockImplementationOnce(() => mockQueryBuilder) // First eq call
                     .mockImplementationOnce(() => Promise.resolve(mockResponse)); // Second eq call

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder);

      const result = await listLocations('org-123');

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toContainEqual(mockLocation);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(`
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
      `);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-123');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    })
  })

  describe('assignUserToLocation', () => {
    it('assigns user to location as primary', async () => {
      const mockUpdateBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      }

      const mockInsertBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockAssignment,
          error: null
        })
      }

      vi.mocked(supabase.from)
        .mockImplementationOnce(() => mockUpdateBuilder)
        .mockImplementationOnce(() => mockInsertBuilder)

      const result = await assignUserToLocation(
        'user-123',
        'loc-123',
        '2025-01-26',
        true
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockAssignment)
      expect(mockUpdateBuilder.update).toHaveBeenCalledWith({ is_primary: false })
    })
  })

  describe('getUserLocations', () => {
    it('retrieves user locations with assignments', async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: [{
            location_id: mockLocation.id,
            is_primary: true,
            job_locations: mockLocation
          }],
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      const result = await getUserLocations('user-123')

      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data[0]).toEqual({
        ...mockLocation,
        is_primary: true
      })
    })
  })

  describe('checkUserInGeofence', () => {
    it('returns true when user is within geofence', async () => {
      // Mock getUserLocations to return a location
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: [{
            location_id: mockLocation.id,
            is_primary: true,
            job_locations: mockLocation
          }],
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      // Test coordinates very close to the mock location
      const result = await checkUserInGeofence(
        'user-123',
        37.7749, // Same latitude as mock location
        -122.4194 // Same longitude as mock location
      )

      expect(result).toBe(true)
    })

    it('returns false when user is outside geofence', async () => {
      // Mock getUserLocations to return a location
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: [{
            location_id: mockLocation.id,
            is_primary: true,
            job_locations: mockLocation
          }],
          error: null
        })
      }

      vi.mocked(supabase.from).mockImplementation(() => mockQueryBuilder)

      // Test coordinates far from the mock location
      const result = await checkUserInGeofence(
        'user-123',
        38.7749, // 1 degree difference in latitude (much larger than the 100m radius)
        -122.4194
      )

      expect(result).toBe(false)
    })
  })
})
