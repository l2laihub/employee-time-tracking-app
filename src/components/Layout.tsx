import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { Button, Card } from './design-system';
import Sidebar from './Sidebar';
import UserAvatar from './UserAvatar';

export default function Layout() {
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Mobile menu button */}
      <Button
        variant="secondary"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-20"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5 text-neutral-600" />
      </Button>

      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/50 z-10 lg:hidden backdrop-blur-sm transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-20 transform lg:relative lg:translate-x-0 
          transition-all duration-300 ease-in-out w-[280px] lg:w-64
          ${isSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'}
        `}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <Card
          elevation="sm"
          padding={false}
          className="rounded-none border-x-0 border-t-0"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-end text-right">
                  <span className="text-sm font-medium text-neutral-900">
                    {user?.email}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {organization?.name}
                  </span>
                </div>
                <UserAvatar />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={signOut}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Page content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}