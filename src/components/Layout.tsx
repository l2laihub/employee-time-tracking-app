import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { OrganizationSwitcher } from './organization/OrganizationSwitcher';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, signOut } = useAuth();
  const { organization, userRole } = useOrganization();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  const navigation = [
    { name: 'Dashboard', href: '/' },
    { name: 'Time Entry', href: '/time-entry' },
    { name: 'Job Locations', href: '/job-locations' },
    ...(isAdmin ? [{ name: 'Employees', href: '/employees' }] : []),
    { name: 'Timesheets', href: '/timesheets' },
    ...(isAdmin ? [{ name: 'Reports', href: '/reports' }] : []),
    { name: 'PTO', href: '/pto' },
  ];

  const isCurrentPath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

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
      <main className="flex-1 overflow-auto px-4 py-6 lg:p-8 pt-16 lg:pt-8">
        <div className="max-w-7xl mx-auto">
          <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <img
                      className="h-8 w-auto"
                      src="/logo.svg"
                      alt="Employee Time Tracking"
                    />
                  </div>
                  <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`${
                          isCurrentPath(item.href)
                            ? 'border-blue-500 text-gray-900'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Organization Switcher */}
                  <OrganizationSwitcher />

                  {/* Profile dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className="flex items-center space-x-3 focus:outline-none"
                    >
                      <div className="flex flex-col items-end">
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
                    </button>

                    {isSidebarOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100">
                        <div className="py-1">
                          {isAdmin && (
                            <>
                              <Link
                                to="/organization/settings"
                                className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => setIsSidebarOpen(false)}
                              >
                                Organization Settings
                              </Link>
                              <Link
                                to="/organization/invites"
                                className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => setIsSidebarOpen(false)}
                              >
                                Manage Invites
                              </Link>
                            </>
                          )}
                        </div>
                        <div className="py-1">
                          <button
                            onClick={signOut}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </nav>

          <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}