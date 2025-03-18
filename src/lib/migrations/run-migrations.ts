import { createServiceTypesTable } from './create-service-types-table';

/**
 * Run all migrations in the correct order
 */
export async function runMigrations() {
  console.log('Starting database migrations...');
  
  // Run service types table migration
  const serviceTypesResult = await createServiceTypesTable();
  if (!serviceTypesResult.success) {
    console.error('Failed to create service_types table:', serviceTypesResult.error);
  } else {
    console.log('Service types table migration completed successfully');
  }
  
  // Add more migrations here as needed
  
  console.log('All migrations completed');
  return { success: true };
}
