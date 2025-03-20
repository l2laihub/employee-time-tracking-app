import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function CreateOrganization() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createOrganization, refreshOrganization, organization } = useOrganization();
  
  // Only show debug info in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Debug effect to check if user already has an organization
  useEffect(() => {
    // Only run in development mode
    if (!isDevelopment || !user) return;
    
    const checkExistingOrg = async () => {
      try {
        // Check for existing memberships
        const { data: memberships, error: membershipError } = await supabase
          .from('organization_members')
          .select('id, organization_id, role, created_at')
          .eq('user_id', user.id);
        
        // Check for existing organizations
        const { data: orgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*');
        
        // Check for existing employees
        const { data: employees, error: employeesError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', user.email || '');
        
        setDebugInfo({
          memberships: {
            data: memberships,
            error: membershipError
          },
          organizations: {
            data: orgs,
            error: orgsError
          },
          employees: {
            data: employees,
            error: employeesError
          }
        });
      } catch (error) {
        console.error('Error checking existing data:', error);
      }
    };
    
    checkExistingOrg();
  }, [user, isDevelopment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);
    try {
      console.log('Creating organization with name:', name);
      await createOrganization(name.trim());
      toast.success('Organization created successfully');
      
      // Refresh organization context to ensure it's up to date
      console.log('Refreshing organization context...');
      await refreshOrganization();
      
      // Check if organization was actually created
      const { data: newMemberships, error: membershipError } = await supabase
        .from('organization_members')
        .select('id, organization_id, role')
        .eq('user_id', user.id);
      
      console.log('New memberships after creation:', newMemberships, membershipError);
      
      if (newMemberships && newMemberships.length > 0) {
        // Navigate to dashboard
        console.log('Organization created, navigating to dashboard');
        navigate('/dashboard');
      } else {
        console.error('Organization creation failed - no membership found');
        toast.error('Organization creation failed - please try again');
      }
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  // Direct database creation as a fallback - only available in development mode
  const handleDirectCreation = async () => {
    if (!isDevelopment || !name.trim() || !user) return;
    
    setLoading(true);
    try {
      console.log('Attempting direct database creation...');
      
      // Generate a unique slug
      const timestamp = Date.now();
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;
      
      // 1. Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: name.trim(),
          slug: slug
        })
        .select()
        .single();
      
      if (orgError) throw orgError;
      console.log('Organization created:', orgData);
      
      // 2. Create organization member
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: user.id,
          role: 'admin'
        })
        .select()
        .single();
      
      if (memberError) throw memberError;
      console.log('Organization member created:', memberData);
      
      // 3. Create employee record
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .insert({
          organization_id: orgData.id,
          member_id: memberData.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          role: 'admin',
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          pto: {
            vacation: {
              beginningBalance: 0,
              ongoingBalance: 0,
              firstYearRule: 40,
              used: 0
            },
            sickLeave: {
              beginningBalance: 0,
              used: 0
            }
          }
        })
        .select()
        .single();
      
      if (employeeError) {
        console.error('Error creating employee:', employeeError);
        // Continue anyway
      } else {
        console.log('Employee created:', employeeData);
      }
      
      toast.success('Organization created successfully via direct method');
      
      // Refresh organization context
      await refreshOrganization();
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error in direct creation:', error);
      toast.error(error.message || 'Failed to create organization directly');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create Your Organization
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Set up your workspace to start tracking time
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Organization Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your organization name"
                />
              </div>
            </div>

            <div className={isDevelopment ? "flex space-x-4" : ""}>
              <button
                type="submit"
                disabled={loading}
                className={`${isDevelopment ? 'flex-1' : 'w-full'} py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
              >
                {loading ? 'Creating...' : 'Create Organization'}
              </button>
              
              {isDevelopment && (
                <button
                  type="button"
                  onClick={handleDirectCreation}
                  disabled={loading}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Direct Creation
                </button>
              )}
            </div>
          </form>
          
          {isDevelopment && debugInfo && (
            <div className="mt-6 p-4 bg-gray-100 rounded-md text-xs overflow-auto max-h-96">
              <h3 className="font-bold mb-2">Debug Information</h3>
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
