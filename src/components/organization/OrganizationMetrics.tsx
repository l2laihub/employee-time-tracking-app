import { useState, useEffect } from 'react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { getOrganizationMetrics, type OrganizationMetrics } from '../../lib/metrics';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export function OrganizationMetrics() {
  const { organization } = useOrganization();
  const [metrics, setMetrics] = useState<OrganizationMetrics | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      loadMetrics();
    }
  }, [organization, dateRange]);

  const loadMetrics = async () => {
    if (!organization) return;

    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const data = await getOrganizationMetrics(organization.id, startDate, endDate);
      setMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-gray-500">Loading metrics...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-gray-500">No metrics available</div>
      </div>
    );
  }

  const weeklyHoursData = {
    labels: metrics.weeklyHours.map(item => item.week),
    datasets: [
      {
        label: 'Hours Tracked',
        data: metrics.weeklyHours.map(item => item.hours),
        backgroundColor: '#3b82f6',
      },
    ],
  };

  const locationDistributionData = {
    labels: metrics.jobLocationDistribution.map(item => item.name),
    datasets: [
      {
        data: metrics.jobLocationDistribution.map(item => item.hours),
        backgroundColor: [
          '#3b82f6',
          '#ef4444',
          '#10b981',
          '#f59e0b',
          '#6366f1',
          '#ec4899',
        ],
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-end space-x-2">
        {(['7d', '30d', '90d'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-3 py-1 text-sm rounded-md ${
              dateRange === range
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {metrics.activeUsers}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Hours</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {metrics.totalHours.toFixed(1)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Avg Hours/User</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {metrics.averageHoursPerUser.toFixed(1)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Time Entries</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {metrics.timeEntriesCount}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Hours</h3>
          <Bar
            data={weeklyHoursData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Job Location Distribution</h3>
          <div className="aspect-square">
            <Pie
              data={locationDistributionData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'right' as const,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* User Activity Table */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">User Activity</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {metrics.userActivityDistribution
                .sort((a, b) => b.hours - a.hours)
                .map((user) => (
                  <tr key={user.email}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {user.hours.toFixed(1)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
