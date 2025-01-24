import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { 
  LayoutDashboard, 
  Clock, 
  MapPin, 
  FileText,
  BarChart2,
  Users,
  Calendar,
  LogOut,
  X,
  Settings,
  UserPlus
} from 'lucide-react';

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { userRole } = useOrganization();
  const isAdmin = userRole === 'admin' || userRole === 'manager';

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Time Entry', href: '/time-entry', icon: Clock },
    { name: 'PTO Requests', href: '/pto', icon: Calendar },
    ...(isAdmin ? [
      { name: 'Job Locations', href: '/job-locations', icon: MapPin },
      { name: 'Employees', href: '/employees', icon: Users }
    ] : []),
    { name: 'Timesheets', href: '/timesheets', icon: FileText },
    ...(isAdmin ? [
      { name: 'Reports', href: '/reports', icon: BarChart2 },
      { name: 'Organization Settings', href: '/admin/settings', icon: Settings },
      { name: 'Manage Invites', href: '/admin/invites', icon: UserPlus }
    ] : []),
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex flex-col w-full h-full bg-white shadow-xl">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <img src="/clockflow_logo.svg" alt="ClockFlow" className="h-8 w-8 object-contain" />
          <h1 className="text-xl font-bold text-gray-900">ClockFlow</h1>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className="px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isCurrentPath = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={`${
                  isCurrentPath
                    ? 'bg-blue-50 text-blue-600 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                } group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg border-l-4 transition-colors duration-200`}
              >
                <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isCurrentPath ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                }`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <div className="flex-shrink-0 w-full group">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
            <div className="truncate">
              <p className="text-sm font-medium text-gray-700">{userRole}</p>
              <p className="text-xs font-medium text-gray-500 truncate capitalize">{userRole}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}