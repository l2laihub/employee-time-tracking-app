import { useContext } from 'react';
import { MigrationContext } from '../contexts/MigrationContext';

export function useMigration() {
  const context = useContext(MigrationContext);
  if (context === undefined) {
    throw new Error('useMigration must be used within a MigrationProvider');
  }
  return context;
}
