import { useState } from 'react';
import { Settings, Wrench, Users } from 'lucide-react';
import ServiceTypeManagement from './ServiceTypeManagement';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<'general' | 'service-types' | 'users'>('general');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white shadow rounded-lg p-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                activeTab === 'general'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Settings className="mr-3 h-5 w-5" />
              <span>General Settings</span>
            </button>
            
            <button
              onClick={() => setActiveTab('service-types')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                activeTab === 'service-types'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Wrench className="mr-3 h-5 w-5" />
              <span>Service Types</span>
            </button>
            
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                activeTab === 'users'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Users className="mr-3 h-5 w-5" />
              <span>User Management</span>
            </button>
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">General Settings</h2>
              <p className="text-gray-500">
                Configure general application settings here.
              </p>
              {/* General settings content will go here */}
            </div>
          )}
          
          {activeTab === 'service-types' && (
            <ServiceTypeManagement />
          )}
          
          {activeTab === 'users' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">User Management</h2>
              <p className="text-gray-500">
                Manage users and their permissions here.
              </p>
              {/* User management content will go here */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
