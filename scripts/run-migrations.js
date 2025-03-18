// Simple script to run migrations manually
import { runMigrations } from '../src/lib/migrations/run-migrations';

async function main() {
  console.log('Starting manual migration...');
  
  try {
    const result = await runMigrations();
    
    if (result.success) {
      console.log('Migrations completed successfully!');
    } else {
      console.error('Migrations failed:', result.error);
    }
  } catch (error) {
    console.error('Error running migrations:', error);
  }
  
  process.exit(0);
}

main();
