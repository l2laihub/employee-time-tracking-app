import React, { createContext, useEffect, useState } from 'react';
import { runMigrations } from '../lib/migrations/run-migrations';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';

interface MigrationContextType {
  migrationsRun: boolean;
  error: Error | null;
}

export const MigrationContext = createContext<MigrationContextType | undefined>(undefined);

export function MigrationProvider({ children }: { children: React.ReactNode }) {
  const [migrationsRun, setMigrationsRun] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const { userRole } = useOrganization();
  
  // Only run migrations if the user is an admin
  useEffect(() => {
    async function executeMigrations() {
      if (user && userRole === 'admin') {
        try {
          const result = await runMigrations();
          if (result.success) {
            setMigrationsRun(true);
          } else {
            setError(new Error('Failed to run migrations'));
          }
        } catch (err) {
          console.error('Error running migrations:', err);
          setError(err instanceof Error ? err : new Error('Unknown error running migrations'));
        }
      }
    }
    
    if (user && userRole === 'admin' && !migrationsRun) {
      executeMigrations();
    }
  }, [user, userRole, migrationsRun]);
  
  return (
    <MigrationContext.Provider value={{ migrationsRun, error }}>
      {children}
    </MigrationContext.Provider>
  );
}
