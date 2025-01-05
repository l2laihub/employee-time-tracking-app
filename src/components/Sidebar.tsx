import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Clock, 
  MapPin, 
  FileText,
  BarChart2,
  Users,
  Calendar,
  LogOut,
  X 
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Time Entry', href: '/time-entry', icon: Clock },
    { name: 'PTO', href: '/pto', icon: Calendar },
    ...(isAdmin ? [
      { name: 'Job Locations', href: '/job-locations', icon: MapPin },
      { name: 'Employees', href: '/employees', icon: Users }
    ] : []),
    { name: 'Timesheets', href: '/timesheets', icon: FileText },
    ...(isAdmin ? [{ name: 'Reports', href: '/reports', icon: BarChart2 }] : []),
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex flex-col w-64 bg-white h-full border-r">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <img src="/clockflow_logo.svg" alt="ClockFlow" className="h-8 w-8 object-contain" />
          <h1 className="text-xl font-bold text-gray-900">ClockFlow</h1>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={`${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                } group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-sm font-medium text-gray-700">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs font-medium text-gray-500 truncate">{user?.role}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}