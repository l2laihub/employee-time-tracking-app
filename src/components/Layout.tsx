import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
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
      <main className="flex-1 overflow-auto px-4 py-6 lg:p-8 pt-16 lg:pt-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}