import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';
import type { Database } from '../../types/database.types';

type OrganizationWithRole = Database['public']['Tables']['organizations']['Row'] & {
  role: string;
};

export function OrganizationSwitcher() {
  const navigate = useNavigate();
  const { organization: currentOrg, setCurrentOrganization } = useOrganization();
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadUserOrganizations();
  }, []);

  const loadUserOrganizations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          organization:organizations!organization_id (
            id,
            name,
            slug,
            settings,
            branding,
            created_at,
            updated_at
          ),
          role::text
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const orgsWithRole = data?.map(item => ({
        ...item.organization,
        role: item.role,
      })) || [];

      setOrganizations(orgsWithRole);
    } catch (err) {
      console.error('Error loading organizations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchOrganization = async (org: OrganizationWithRole) => {
    try {
      setCurrentOrganization(org);
      setIsOpen(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error switching organization:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <span>{currentOrg?.name || 'Select Organization'}</span>
        <svg
          className={`h-5 w-5 text-gray-400 transform transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100">
          <div className="py-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSwitchOrganization(org)}
                className={`group flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 ${
                  currentOrg?.id === org.id ? 'bg-gray-50' : ''
                }`}
              >
                <span className="flex-grow text-left">{org.name}</span>
                <span className="ml-2 text-xs text-gray-500">{org.role}</span>
                {currentOrg?.id === org.id && (
                  <svg
                    className="ml-2 h-4 w-4 text-blue-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/select-organization');
              }}
              className="group flex items-center w-full px-4 py-2 text-sm text-blue-600 hover:bg-gray-50"
            >
              <svg
                className="mr-3 h-5 w-5 text-blue-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                  clipRule="evenodd"
                />
              </svg>
              Create or Join Organization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
