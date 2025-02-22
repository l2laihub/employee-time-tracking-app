import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { getEmployeeByEmail } from '../services/employees';
import type { Employee } from '../lib/types';
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
  const { user, signOut } = useAuth();
  const { userRole, organization } = useOrganization();
  const isAdmin = userRole === 'admin' || userRole === 'manager';
  const [employeeData, setEmployeeData] = React.useState<Employee | null>(null);

  // Function to fetch employee data
  const fetchEmployeeData = React.useCallback(async () => {
    if (!user?.email || !organization?.id) return;

    const result = await getEmployeeByEmail(user.email, organization.id);
    if (result.success && result.data) {
      // Ensure we're dealing with a single employee record
      const employee = Array.isArray(result.data) ? result.data[0] : result.data;
      setEmployeeData(employee);
    } else {
      console.error('Failed to fetch employee data:', result.error);
    }
  }, [user?.email, organization?.id]);

  // Initial fetch and listen for employee updates
  React.useEffect(() => {
    fetchEmployeeData();

    // Listen for employee updates
    const handleEmployeeUpdate = () => {
      console.log('Employee update detected, refreshing sidebar data');
      fetchEmployeeData();
    };

    window.addEventListener('employee-updated', handleEmployeeUpdate);

    return () => {
      window.removeEventListener('employee-updated', handleEmployeeUpdate);
    };
  }, [fetchEmployeeData]);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
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
            <Link
              to="/settings"
              onClick={onClose}
              className="flex items-center p-2 rounded-lg hover:bg-gray-50 mb-2"
            >
              <div className="truncate flex-1">
                <p className="text-sm font-medium text-gray-700">
                  {employeeData?.first_name} {employeeData?.last_name}
                </p>
                <p className="text-xs font-medium text-gray-500 truncate capitalize">{userRole}</p>
              </div>
              <Settings className="h-5 w-5 text-gray-500" />
            </Link>
            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
              aria-label="Sign out"
            >
              <span className="mr-2">Sign Out</span>
              <LogOut className="h-5 w-5" />
            </button>
        </div>
      </div>
    </div>
  );
}
