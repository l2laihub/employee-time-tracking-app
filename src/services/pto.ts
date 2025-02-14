 vimport { supabase } from '../lib/supabase';
import { PTORequest } from '../lib/types';

export interface PTORequestResult {
  success: boolean;
  data?: PTORequest | PTORequest[];
  error?: string;
}

export async function createPTORequest(
  userId: string,
  organizationId: string,
  request: Omit<PTORequest, 'id' | 'status' | 'createdAt'>
): Promise<PTORequestResult> {
  try {
    // Get current auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      throw new Error('Not authenticated');
    }

    // Call the create_pto_request function
    const { data, error } = await supabase
      .rpc('create_pto_request', {
        p_user_id: userId,
        p_organization_id: organizationId,
        p_start_date: request.startDate,
        p_end_date: request.endDate,
        p_type: request.type,
        p_hours: request.hours,
        p_reason: request.reason
      });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to create PTO request');
    }

    const ptoRequest = data.data;

    return {
      success: true,
      data: {
        id: ptoRequest.id,
        userId: ptoRequest.user_id,
        startDate: ptoRequest.start_date,
        endDate: ptoRequest.end_date,
        type: ptoRequest.type,
        hours: ptoRequest.hours,
        reason: ptoRequest.reason,
        status: ptoRequest.status,
        createdAt: ptoRequest.created_at,
        createdBy: ptoRequest.created_by,
        reviewedBy: ptoRequest.reviewed_by,
        reviewedAt: ptoRequest.reviewed_at
      }
    };
  } catch (error) {
    console.error('Failed to create PTO request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function updatePTORequestStatus(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  notes?: string
): Promise<PTORequestResult> {
  try {
    const { data, error } = await supabase
      .from('pto_requests')
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        notes
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        id: data.id,
        userId: data.user_id,
        startDate: data.start_date,
        endDate: data.end_date,
        type: data.type,
        hours: data.hours,
        reason: data.reason,
        status: data.status,
        createdAt: data.created_at,
        createdBy: data.created_by,
        reviewedBy: data.reviewed_by,
        reviewedAt: data.reviewed_at
      }
    };
  } catch (error) {
    console.error('Failed to update PTO request status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function deletePTORequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('pto_requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Failed to delete PTO request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function listPTORequests(
  organizationId: string,
  filters?: {
    userId?: string;
    status?: 'pending' | 'approved' | 'rejected';
    startDate?: Date;
    endDate?: Date;
  }
): Promise<PTORequestResult> {
  try {
    console.log('Listing PTO requests:', { organizationId, filters });
    
    // Get current auth user for debugging
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    console.log('Current auth user:', {
      id: authUser?.id,
      email: authUser?.email,
      error: authError?.message
    });

    // Get organization member info for debugging
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('user_id', authUser?.id)
      .eq('organization_id', organizationId)
      .single();

    console.log('Organization member info:', {
      memberId: memberData?.id,
      role: memberData?.role,
      error: memberError?.message
    });

    let query = supabase
      .from('pto_requests')
      .select(`
        *,
        employee:employees!pto_requests_user_id_fkey (
          id,
          first_name,
          last_name,
          member_id
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters) {
      console.log('Applying filters:', filters);
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.startDate) {
        query = query.gte('start_date', filters.startDate.toISOString().split('T')[0]);
      }
      if (filters.endDate) {
        query = query.lte('end_date', filters.endDate.toISOString().split('T')[0]);
      }
    }

    // Log the query parameters for debugging
    console.log('Executing PTO requests query with params:', {
      organizationId,
      filters,
      table: 'pto_requests',
      operation: 'select'
    });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching PTO requests:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('Raw PTO requests response:', {
      hasData: !!data,
      count: data?.length || 0,
      firstItem: data?.[0] ? {
        id: data[0].id,
        userId: data[0].user_id,
        organizationId: data[0].organization_id,
        status: data[0].status
      } : null
    });

    console.log('PTO requests query result:', {
      count: data?.length || 0,
      statuses: data?.reduce((acc, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });

    return {
      success: true,
      data: data.map(item => ({
        id: item.id,
        userId: item.user_id,
        startDate: item.start_date,
        endDate: item.end_date,
        type: item.type,
        hours: item.hours,
        reason: item.reason,
        status: item.status,
        createdAt: item.created_at,
        createdBy: item.created_by,
        reviewedBy: item.reviewed_by,
        reviewedAt: item.reviewed_at
      }))
    };
  } catch (error) {
    console.error('Failed to list PTO requests:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
