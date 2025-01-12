import React, { createContext, useContext, useState, ReactNode } from 'react';
import { mockTimeEntries } from '../lib/mockData';
import { useAuth } from './AuthContext';

type TimeEntry = typeof mockTimeEntries[0];

interface TimeEntryContextType {
  activeEntry: TimeEntry | undefined | null;
  isOnBreak: boolean;
  setActiveEntry: (entry: TimeEntry | undefined | null) => void;
  startBreak: () => void;
  endBreak: () => void;
}

export type { TimeEntry };

const TimeEntryContext = createContext<TimeEntryContextType | undefined>(undefined);

export function TimeEntryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeEntry, setActiveEntry] = useState<typeof mockTimeEntries[0] | undefined | null>(
    mockTimeEntries.find(entry => entry.userId === user?.id && !entry.clockOut)
  );
  const [isOnBreak, setIsOnBreak] = useState(false);

  const startBreak = () => {
    setIsOnBreak(true);
  };

  const endBreak = () => {
    setIsOnBreak(false);
  };

  return (
    <TimeEntryContext.Provider
      value={{
        activeEntry,
        isOnBreak,
        setActiveEntry,
        startBreak,
        endBreak,
      }}
    >
      {children}
    </TimeEntryContext.Provider>
  );
}

export function useTimeEntry() {
  const context = useContext(TimeEntryContext);
  if (context === undefined) {
    throw new Error('useTimeEntry must be used within a TimeEntryProvider');
  }
  return context;
}
