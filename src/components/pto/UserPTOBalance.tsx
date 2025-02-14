import React, { useEffect, useState } from 'react';
import { Employee } from '../../lib/types';
import { Briefcase, Stethoscope } from 'lucide-react';
import { getVacationAllocationText } from '../../utils/ptoCalculations';
import { usePTO } from '../../contexts/PTOContext';

interface PTOBalances {
  vacation: number;
  sickLeave: number;
}

interface UserPTOBalanceProps {
  user: Employee | undefined;
}

export default function UserPTOBalance({ user }: UserPTOBalanceProps) {
  const { getPTOBalance } = usePTO();
  const [balances, setBalances] = useState<PTOBalances>({ 
    vacation: 0, 
    sickLeave: 0 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBalances() {
      if (!user?.id) {
        console.log('No user data available for PTO balance');
        setLoading(false);
        setError('Employee not found');
        return;
      }

      console.log('Fetching PTO balances for user:', {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`
      });

      try {
        setLoading(true);
        setError(null);

        const [vacationBalance, sickLeaveBalance] = await Promise.all([
          getPTOBalance(user, 'vacation'),
          getPTOBalance(user, 'sick_leave')
        ]);

        setBalances({
          vacation: vacationBalance,
          sickLeave: sickLeaveBalance
        });
      } catch (err) {
        console.error('Error fetching PTO balances:', err);
        setError('Failed to load PTO balances');
      } finally {
        setLoading(false);
      }
    }

    fetchBalances();
  }, [user, getPTOBalance]);

  // Show loading state while fetching balances
  if (!user || !user.id) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-500">No employee selected</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-500">Loading PTO balance...</div>
      </div>
    );
  }

  // Show error state if there was a problem
  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 mb-4">
        <div className="text-sm text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center space-x-3">
          <Briefcase className="w-5 h-5 text-blue-500" />
          <div>
            <div className="text-sm font-medium text-gray-500">Vacation Balance</div>
            <div className="text-lg font-semibold">{balances.vacation} hours</div>
            <div className="text-xs text-gray-500">
              Allocation: {getVacationAllocationText(user)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Stethoscope className="w-5 h-5 text-green-500" />
          <div>
            <div className="text-sm font-medium text-gray-500">Sick Leave Balance</div>
            <div className="text-lg font-semibold">{balances.sickLeave} hours</div>
            <div className="text-xs text-gray-500">
              Accrues: 1 hour per 40 hours worked
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
