import { jobLocations } from './mockReportData';

export interface JobLocationImport {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  type: 'commercial' | 'residential';
  serviceType: 'hvac' | 'plumbing' | 'both';
}

export async function importJobLocations(file: File): Promise<JobLocationImport[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        
        const locations: JobLocationImport[] = lines
          .slice(1) // Skip header row
          .filter(line => line.trim()) // Skip empty lines
          .map(line => {
            const values = line.split(',').map(value => value.trim());
            const location: JobLocationImport = {
              name: values[headers.indexOf('name')],
              address: values[headers.indexOf('address')],
              city: values[headers.indexOf('city')],
              state: values[headers.indexOf('state')],
              zip: values[headers.indexOf('zip')],
              type: values[headers.indexOf('type')] as 'commercial' | 'residential',
              serviceType: values[headers.indexOf('serviceType')] as 'hvac' | 'plumbing' | 'both'
            };
            return location;
          });
          
        resolve(locations);
      } catch (error) {
        reject(new Error('Failed to parse CSV file. Please check the format.'));
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
  if (!['hvac', 'plumbing', 'both'].includes(location.serviceType)) {
    errors.push('Service type must be hvac, plumbing, or both');
  }
  
  return errors;
}

export function downloadJobLocationsTemplate(): void {
  const headers = ['name', 'address', 'city', 'state', 'zip', 'type', 'serviceType'];
  const sampleData = [
    'Desert Ridge Mall,21001 N Tatum Blvd,Phoenix,AZ,85050,commercial,hvac',
    'Johnson Residence,4521 E McKellips Rd,Mesa,AZ,85215,residential,both'
  ];
  
  const csvContent = [headers.join(','), ...sampleData].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'job_locations_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}