# Reports

The Reports module in ClockFlow provides comprehensive analytics and reporting capabilities for time tracking data.

## Features

### 1. Standard Reports
- Time and Attendance
- Overtime Analysis
- PTO Usage
- Cost Analysis
- Location Reports
- Compliance Reports

### 2. Custom Report Builder
- Flexible field selection
- Custom filters
- Advanced grouping
- Sort options
- Saved report templates

### 3. Data Visualization
- Interactive charts
- Time-based trends
- Comparative analysis
- Department breakdowns
- Cost projections

## Implementation

### 1. Report Generation

```typescript
interface ReportConfig {
  type: ReportType;
  startDate: Date;
  endDate: Date;
  filters: ReportFilter[];
  groupBy?: string[];
  sortBy?: SortConfig[];
  includeFields: string[];
}

interface ReportFilter {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'contains' | 'between';
  value: any;
}

async function generateReport(config: ReportConfig): Promise<ReportData> {
  // Build query
  const query = buildReportQuery(config);
  
  // Execute query
  const data = await executeReportQuery(query);
  
  // Process results
  const processed = processReportData(data, config);
  
  // Generate visualizations
  const visualizations = generateVisualizations(processed, config);
  
  return {
    config,
    data: processed,
    visualizations,
    generatedAt: new Date()
  };
}
```

### 2. Custom Report Builder

```typescript
interface ReportBuilder {
  fields: Field[];
  filters: Filter[];
  groupings: string[];
  sortOrder: SortOrder[];
  template?: ReportTemplate;
}

function useReportBuilder() {
  const [config, setConfig] = useState<ReportBuilder>({
    fields: [],
    filters: [],
    groupings: [],
    sortOrder: []
  });
  
  const addField = (field: Field) => {
    setConfig(prev => ({
      ...prev,
      fields: [...prev.fields, field]
    }));
  };
  
  const addFilter = (filter: Filter) => {
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, filter]
    }));
  };
  
  const saveTemplate = async () => {
    const template: ReportTemplate = {
      ...config,
      name: 'Custom Report',
      createdAt: new Date()
    };
    
    await saveReportTemplate(template);
  };
  
  return {
    config,
    addField,
    addFilter,
    saveTemplate
  };
}
```

### 3. Data Visualization

```typescript
interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  data: any[];
  xAxis: string;
  yAxis: string;
  groupBy?: string;
  options?: ChartOptions;
}

function generateCharts(data: ReportData, config: ChartConfig[]): Chart[] {
  return config.map(chartConfig => {
    const processedData = processChartData(data, chartConfig);
    
    return {
      type: chartConfig.type,
      data: processedData,
      options: {
        ...defaultChartOptions,
        ...chartConfig.options
      }
    };
  });
}

function useChartData(reportData: ReportData, config: ChartConfig) {
  const chartRef = useRef<Chart>();
  
  useEffect(() => {
    if (!chartRef.current) {
      chartRef.current = new Chart(config);
    }
    
    chartRef.current.updateData(reportData);
  }, [reportData, config]);
  
  return chartRef.current;
}
```

## User Interface

### 1. Report Builder Interface

```tsx
function ReportBuilder() {
  const { config, addField, addFilter } = useReportBuilder();
  
  const onSubmit = async () => {
    try {
      const report = await generateReport(config);
      showSuccess('Report generated successfully');
      return report;
    } catch (error) {
      showError('Failed to generate report');
    }
  };
  
  return (
    <div className="report-builder">
      <FieldSelector
        onSelect={addField}
        selected={config.fields}
      />
      <FilterBuilder
        onAddFilter={addFilter}
        filters={config.filters}
      />
      <GroupingSelector
        fields={config.fields}
        selected={config.groupings}
      />
      <SortOrderSelector
        fields={config.fields}
        sortOrder={config.sortOrder}
      />
      <Button onClick={onSubmit}>
        Generate Report
      </Button>
    </div>
  );
}
```

### 2. Report Viewer

```tsx
function ReportViewer({ report }: Props) {
  const [view, setView] = useState<'table' | 'chart'>('table');
  
  return (
    <div className="report-viewer">
      <ReportHeader report={report} />
      <ViewToggle value={view} onChange={setView} />
      
      {view === 'table' ? (
        <DataTable
          data={report.data}
          columns={report.config.fields}
          sortable
          filterable
        />
      ) : (
        <ChartView
          data={report.data}
          charts={report.visualizations}
        />
      )}
      
      <ExportOptions report={report} />
    </div>
  );
}
```

## Data Processing

### 1. Query Building

```typescript
function buildReportQuery(config: ReportConfig): Query {
  let query = supabase
    .from(config.type)
    .select(config.includeFields.join(','));
  
  // Apply filters
  config.filters.forEach(filter => {
    query = applyFilter(query, filter);
  });
  
  // Apply grouping
  if (config.groupBy) {
    query = query.group(config.groupBy);
  }
  
  // Apply sorting
  config.sortBy?.forEach(sort => {
    query = query.order(sort.field, {
      ascending: sort.ascending
    });
  });
  
  return query;
}
```

### 2. Data Aggregation

```typescript
function aggregateData(data: any[], config: AggregationConfig) {
  const grouped = groupBy(data, config.groupBy);
  
  return Object.entries(grouped).map(([key, group]) => ({
    key,
    count: group.length,
    sum: sumBy(group, config.sumField),
    average: averageBy(group, config.avgField),
    min: minBy(group, config.minField),
    max: maxBy(group, config.maxField)
  }));
}
```

## Export Capabilities

### 1. Export Formats

```typescript
async function exportReport(
  report: Report,
  format: 'pdf' | 'excel' | 'csv'
): Promise<Buffer> {
  switch (format) {
    case 'pdf':
      return exportToPDF(report);
    case 'excel':
      return exportToExcel(report);
    case 'csv':
      return exportToCSV(report);
    default:
      throw new Error('Unsupported export format');
  }
}
```

### 2. Scheduled Reports

```typescript
interface ScheduledReport {
  id: string;
  config: ReportConfig;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
  };
  recipients: string[];
}

async function scheduleReport(config: ScheduledReport): Promise<void> {
  // Save schedule
  await saveScheduledReport(config);
  
  // Set up cron job
  const cronExpression = generateCronExpression(config.schedule);
  await scheduler.addJob({
    name: `report-${config.id}`,
    cron: cronExpression,
    task: async () => {
      const report = await generateReport(config.config);
      await emailReport(report, config.recipients);
    }
  });
}
```

## Integration Points

### 1. Email Integration

```typescript
async function emailReport(report: Report, recipients: string[]): Promise<void> {
  // Generate report formats
  const [pdf, excel] = await Promise.all([
    exportToPDF(report),
    exportToExcel(report)
  ]);
  
  // Send email
  await emailService.send({
    to: recipients,
    subject: `${report.config.type} Report - ${format(report.generatedAt)}`,
    body: generateReportEmail(report),
    attachments: [
      {
        filename: 'report.pdf',
        content: pdf
      },
      {
        filename: 'report.xlsx',
        content: excel
      }
    ]
  });
}
```

### 2. Dashboard Integration

```typescript
function useDashboardReport(config: ReportConfig) {
  const [data, setData] = useState<ReportData | null>(null);
  
  useEffect(() => {
    const fetchReport = async () => {
      const report = await generateReport(config);
      setData(report.data);
    };
    
    fetchReport();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchReport, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [config]);
  
  return data;
}
```
