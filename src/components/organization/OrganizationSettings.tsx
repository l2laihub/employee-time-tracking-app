import { useState } from 'react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { ManageInvites } from './ManageInvites';
import { OrganizationMetrics } from './OrganizationMetrics';
import { OrganizationBranding } from './OrganizationBranding';

export function OrganizationSettings() {
  const { organization, userRole } = useOrganization();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'metrics' | 'branding'>('overview');

  if (!organization) return null;

  const isAdmin = userRole === 'admin';

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Members
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('metrics')}
                className={`${
                  activeTab === 'metrics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Metrics
              </button>
              <button
                onClick={() => setActiveTab('branding')}
                className={`${
                  activeTab === 'branding'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Branding
              </button>
            </>
          )}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Organization Details</h3>
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{organization.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plan</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {organization.plan_type || 'Free'}
                  </p>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div>
                <h3 className="text-lg font-medium text-gray-900">Danger Zone</h3>
                <div className="mt-4">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete Organization
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div>
            <ManageInvites />
          </div>
        )}

        {activeTab === 'metrics' && isAdmin && (
          <div>
            <OrganizationMetrics />
          </div>
        )}

        {activeTab === 'branding' && isAdmin && (
          <div>
            <OrganizationBranding />
          </div>
        )}
      </div>
    </div>
  );
}
