import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-20 p-2.5 rounded-lg bg-white shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-20 transform lg:relative lg:translate-x-0 
        transition duration-300 ease-in-out w-[280px] lg:w-64
        ${isSidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Simplified header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-end text-right">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.email}
                  </span>
                  <span className="text-xs text-gray-500">
                    {organization?.name}
                  </span>
                </div>
                <img
                  className="h-8 w-8 rounded-full"
                  src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email}`}
                  alt=""
                />
                <button
                  onClick={signOut}
                  className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}