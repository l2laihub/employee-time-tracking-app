# Time Entry Implementation

## Code Examples

### Creating a Time Entry

```typescript
// Time Entry Service
export async function createTimeEntry(
  userId: string,
  startTime: string,
  organizationId: string
): Promise<TimeEntryResult> {
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: userId,
      start_time: startTime,
      status: 'working',
      organization_id: organizationId
    })
    .select()
    .single();

  if (error) throw error;
  return { timeEntry: data };
}
```

### Managing Breaks

```typescript
// Start Break
export async function startBreak(timeEntryId: string): Promise<TimeEntryResult> {
  const { data, error } = await supabase
    .from('time_entries')
    .update({ status: 'break' })
    .eq('id', timeEntryId)
    .select()
    .single();

  if (error) throw error;
  return { timeEntry: data };
}

// End Break
export async function endBreak(
  timeEntryId: string,
  breakDuration: number
): Promise<TimeEntryResult> {
  const { data, error } = await supabase
    .from('time_entries')
    .update({
      status: 'working',
      break_duration: breakDuration
    })
    .eq('id', timeEntryId)
    .select()
    .single();

  if (error) throw error;
  return { timeEntry: data };
}
```

### Time Entry List Component

```typescript
// TimeEntryList.tsx
export function TimeEntryList({ organizationId }: TimeEntryListProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Group entries by date
  const groupedEntries = useMemo(() => {
    return entries.reduce((groups, entry) => {
      const date = startOfDay(parseISO(entry.start_time));
      const key = format(date, 'yyyy-MM-dd');
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
      return groups;
    }, {} as Record<string, TimeEntry[]>);
  }, [entries]);

  // Render date group
  const renderDateGroup = (date: string, entries: TimeEntry[]) => (
    <div key={date} className="space-y-2">
      <h3 className="text-sm font-medium text-gray-500">
        {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
      </h3>
      {entries.map(entry => (
        <TimeEntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Recent Time Entries</h2>
        <button onClick={() => setShowFilters(!showFilters)}>
          <span className="mr-1">⚡</span>
          Filters
        </button>
      </div>

      {/* Entry List */}
      <div className="space-y-6">
        {Object.entries(groupedEntries).map(([date, entries]) =>
          renderDateGroup(date, entries)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

## Error Handling

### Service Level Errors

```typescript
export async function handleTimeEntryError(error: any): Promise<string> {
  // Known error types
  if (error.code === 'ALREADY_CLOCKED_IN') {
    return 'You are already clocked in';
  }
  
  // Database errors
  if (error.code === '23505') {
    return 'Duplicate time entry detected';
  }
  
  // Default error
  return 'An error occurred while processing your request';
}
```

### Component Level Errors

```typescript
function TimeControls() {
  const [error, setError] = useState<string | null>(null);
  
  const handleClockIn = async () => {
    try {
      await clockIn();
      setError(null);
    } catch (err) {
      setError(await handleTimeEntryError(err));
    }
  };
  
  return (
    <div>
      {error && (
        <div className="text-red-600 text-sm mb-2">
          {error}
        </div>
      )}
      <button onClick={handleClockIn}>
        Clock In
      </button>
    </div>
  );
}
```

## Performance Considerations

### Optimizing Data Loading

```typescript
// Efficient pagination query
export async function listTimeEntries(
  organizationId: string,
  page: number,
  limit: number
): Promise<TimeEntryListResult> {
  const start = (page - 1) * limit;
  
  const { data, error, count } = await supabase
    .from('time_entries')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('start_time', { ascending: false })
    .range(start, start + limit - 1);

  if (error) throw error;
  return {
    entries: data || [],
    total: count || 0,
    page,
    limit
  };
}
```

### State Management

```typescript
// Efficient state updates
function useTimeEntryState() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  
  // Optimistic updates
  const updateEntry = (updatedEntry: TimeEntry) => {
    setEntries(current =>
      current.map(entry =>
        entry.id === updatedEntry.id ? updatedEntry : entry
      )
    );
  };
  
  // Batch updates
  const addEntries = (newEntries: TimeEntry[]) => {
    setEntries(current => {
      const entryMap = new Map(current.map(entry => [entry.id, entry]));
      newEntries.forEach(entry => entryMap.set(entry.id, entry));
      return Array.from(entryMap.values());
    });
  };
  
  return { entries, updateEntry, addEntries };
}
