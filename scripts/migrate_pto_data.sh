#!/bin/bash

# Exit on error
set -e

# Configuration
DB_NAME="employee_time_tracking"
SUPABASE_PROJECT="employee-time-tracking"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$BACKUP_DIR/migration.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
  local level=$1
  local message=$2
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"

log "INFO" "Starting PTO data migration..."

# Step 1: Backup current database
log "INFO" "Creating database backup..."
supabase db dump -f "$BACKUP_DIR/pre_migration_backup.sql" || {
  log "ERROR" "Database backup failed"
  exit 1
}
log "INFO" "Database backup created at $BACKUP_DIR/pre_migration_backup.sql"

# Step 2: Verify migrations exist
if [ ! -f "supabase/migrations/20250210_create_pto_requests.sql" ] || \
   [ ! -f "supabase/migrations/20250210_update_pto_requests.sql" ]; then
  log "ERROR" "Required migration files not found"
  exit 1
fi

# Step 3: Run migrations
log "INFO" "Running database migrations..."
supabase migration up || {
  log "ERROR" "Migration failed"
  exit 1
}

# Step 4: Backup mock data files
log "INFO" "Backing up mock data files..."
mkdir -p "$BACKUP_DIR/mock_data"
cp src/lib/mockPTOData.ts "$BACKUP_DIR/mock_data/" || {
  log "ERROR" "Mock data backup failed"
  exit 1
}

# Step 5: Run test data seeding
log "INFO" "Seeding test data..."
psql "$DB_NAME" -f scripts/seed_test_pto_data.sql > "$BACKUP_DIR/seed.log" 2>&1 || {
  log "ERROR" "Test data seeding failed"
  cat "$BACKUP_DIR/seed.log"
  exit 1
}

# Step 6: Run tests
log "INFO" "Running tests..."
npm run test > "$BACKUP_DIR/tests.log" 2>&1 || {
  log "ERROR" "Tests failed"
  cat "$BACKUP_DIR/tests.log"
  exit 1
}

# Step 7: Verify data migration
log "INFO" "Verifying data migration..."
psql "$DB_NAME" -f scripts/cleanup_mock_pto_data.sql > "$BACKUP_DIR/verification.log" 2>&1
if [ $? -ne 0 ]; then
  log "ERROR" "Data verification failed"
  cat "$BACKUP_DIR/verification.log"
  
  # Prompt for rollback
  read -p "Would you like to rollback the migration? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "INFO" "Rolling back migration..."
    psql "$DB_NAME" -c "SELECT rollback_pto_mock_cleanup();" || {
      log "ERROR" "Rollback failed"
      exit 1
    }
    log "INFO" "Rollback completed successfully"
  fi
  exit 1
fi

# Step 8: Remove mock data files
log "INFO" "Removing mock data files..."
if [ -f "src/lib/mockPTOData.ts" ]; then
  rm src/lib/mockPTOData.ts || {
    log "ERROR" "Failed to remove mock data files"
    exit 1
  }
fi

# Step 9: Update imports
log "INFO" "Updating imports..."
find src -type f -name "*.ts" -o -name "*.tsx" | while read -r file; do
  # Remove mock data imports
  sed -i '' '/import.*mockPTOData/d' "$file" || {
    log "ERROR" "Failed to update imports in $file"
    exit 1
  }
done

# Step 10: Final verification
log "INFO" "Running final verification..."
npm run build > "$BACKUP_DIR/build.log" 2>&1 || {
  log "ERROR" "Build failed after migration"
  cat "$BACKUP_DIR/build.log"
  exit 1
}

# Success
log "INFO" "Migration completed successfully!"
echo -e "\n${GREEN}Migration Summary:${NC}"
echo -e "- Database migrations: ${GREEN}✓${NC}"
echo -e "- Test data seeding: ${GREEN}✓${NC}"
echo -e "- Tests passing: ${GREEN}✓${NC}"
echo -e "- Data verification: ${GREEN}✓${NC}"
echo -e "- Mock data cleanup: ${GREEN}✓${NC}"
echo -e "- Build verification: ${GREEN}✓${NC}"
echo -e "\nBackups stored in: ${YELLOW}$BACKUP_DIR${NC}"
echo -e "Logs available in: ${YELLOW}$LOG_FILE${NC}"
