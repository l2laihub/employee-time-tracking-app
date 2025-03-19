import { supabase } from './supabase';

export interface JobLocationImport {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: 'commercial' | 'residential';
  serviceType: string; 
}

export async function importJobLocations(file: File): Promise<JobLocationImport[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.split('\n');
        
        // Skip comment lines that start with #
        const headerLine = lines.find(line => !line.trim().startsWith('#') && line.trim().length > 0);
        if (!headerLine) {
          throw new Error('No header line found in CSV file');
        }
        
        const headers = headerLine.split(',').map(header => header.trim());
        
        const locations: JobLocationImport[] = lines
          .filter(line => !line.trim().startsWith('#') && line.trim().length > 0 && line !== headerLine)
          .map(line => {
            const values = line.split(',').map(value => value.trim());
            const location: JobLocationImport = {
              name: values[headers.indexOf('name')],
              address: values[headers.indexOf('address')],
              city: values[headers.indexOf('city')],
              state: values[headers.indexOf('state')],
              zip: values[headers.indexOf('zip')],
              type: values[headers.indexOf('type')] as 'commercial' | 'residential',
              serviceType: values[headers.indexOf('serviceType')]
            };
            return location;
          });
          
        resolve(locations);
      } catch (error: unknown) {
        reject(error instanceof Error 
          ? error 
          : new Error('Failed to parse CSV file. Please check the format.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };
    
    reader.readAsText(file);
  });
}

export function validateJobLocation(location: JobLocationImport): string[] {
  const errors: string[] = [];
  
  if (!location.name) errors.push('Name is required');
  if (!location.address) errors.push('Address is required');
  if (!location.city) errors.push('City is required');
  if (!location.state) errors.push('State is required');
  if (!location.zip) errors.push('ZIP code is required');
  if (!['commercial', 'residential'].includes(location.type)) {
    errors.push('Type must be either commercial or residential');
  }
  if (!location.serviceType) {
    errors.push('Service type is required');
  }
  
  return errors;
}

export async function downloadJobLocationsTemplate(organizationId: string): Promise<void> {
  try {
    // Fetch available service types for the organization
    const { data: serviceTypes, error: serviceTypesError } = await supabase
      .from('service_types')
      .select('name')
      .eq('organization_id', organizationId)
      .order('name');
    
    if (serviceTypesError) throw serviceTypesError;
    
    if (!serviceTypes || serviceTypes.length === 0) {
      throw new Error('No service types found for your organization. Please create service types first.');
    }
    
    const headers = ['name', 'address', 'city', 'state', 'zip', 'type', 'serviceType'];
    
    const serviceTypeNames = serviceTypes.map(st => st.name);
    const serviceTypesList = serviceTypeNames.join(', ');
    
    const commentLine = `# Available service types for your organization: ${serviceTypesList}`;
    
    const sampleData = [
      `Desert Ridge Mall,21001 N Tatum Blvd,Phoenix,AZ,85050,commercial,${serviceTypeNames[0] || 'ENTER_SERVICE_TYPE_HERE'}`,
      `Johnson Residence,4521 E McKellips Rd,Mesa,AZ,85215,residential,${serviceTypeNames.length > 1 ? serviceTypeNames[1] : serviceTypeNames[0] || 'ENTER_SERVICE_TYPE_HERE'}`
    ];
    
    const csvContent = [commentLine, headers.join(','), ...sampleData].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'job_locations_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error creating template:', error);
    throw error;
  }
}