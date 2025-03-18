import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TimeEntry } from '../types/custom.types';
import { useAuth } from './AuthContext';
import { getActiveTimeEntry, startBreak as startBreakService, endBreak as endBreakService } from '../services/timeEntries';

interface TimeEntryContextType {
  activeEntry: TimeEntry | undefined;
  isLoading: boolean;
  error: string | undefined;
  setActiveEntry: (entry: TimeEntry | undefined) => void;
  startBreak: () => Promise<void>;
  endBreak: () => Promise<void>;
}

const TimeEntryContext = createContext<TimeEntryContextType | undefined>(undefined);

export function TimeEntryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeEntry, setActiveEntry] = useState<TimeEntry | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function fetchActiveEntry() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      const result = await getActiveTimeEntry(user.id);
      if (result.success && result.data) {
        setActiveEntry(result.data as TimeEntry);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    }

    fetchActiveEntry();
  }, [user?.id]);

  const handleStartBreak = async () => {
    if (!activeEntry) return;
    
    setIsLoading(true);
    const result = await startBreakService(activeEntry.id);
    if (result.success && result.data) {
      setActiveEntry(result.data as TimeEntry);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const handleEndBreak = async () => {
    if (!activeEntry) return;
    
    setIsLoading(true);
    const result = await endBreakService(activeEntry.id);
    if (result.success && result.data) {
      setActiveEntry(result.data as TimeEntry);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <TimeEntryContext.Provider
      value={{
        activeEntry,
        isLoading,
        error,
        setActiveEntry,
        startBreak: handleStartBreak,
        endBreak: handleEndBreak,
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

export type { TimeEntry };
