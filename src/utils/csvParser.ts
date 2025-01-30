/**
 * Parses a CSV string into an array of objects
 * @param csvText The CSV text to parse
 * @returns Array of objects with keys from the header row
 */
export function parseCSV<T>(csvText: string): T[] {
  try {
    // Split into lines and remove empty lines
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    // Parse header row
    const headers = lines[0].split(',').map(header => 
      header.trim()
        .toLowerCase()
        .replace(/[\s-]/g, '_') // Convert spaces and hyphens to underscores
    );

    console.log('CSV Headers:', headers);

    // Parse data rows
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(value => value.trim());
      console.log(`Row ${index + 2} values:`, values);
      
      // Ensure row has correct number of columns
      if (values.length !== headers.length) {
        throw new Error(`Row ${index + 2} has ${values.length} columns but should have ${headers.length} (${headers.join(', ')})`);
      }

      // Create object from headers and values
      const row = {} as any;
      headers.forEach((header, i) => {
        try {
          // Convert empty strings to null
          const value = values[i] === '' ? null : values[i];
          
          // Parse dates
          if (header.includes('date') && value) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              throw new Error(`Invalid date format for ${header}: ${value}`);
            }
            row[header] = date.toISOString().split('T')[0];
          }
          // Parse numbers
          else if (!isNaN(Number(value)) && value !== null) {
            row[header] = Number(value);
          }
          // Parse booleans
          else if (value?.toLowerCase() === 'true' || value?.toLowerCase() === 'false') {
            row[header] = value.toLowerCase() === 'true';
          }
          // Keep strings as is
          else {
            row[header] = value;
          }
        } catch (error) {
          throw new Error(`Error parsing ${header} in row ${index + 2}: ${error instanceof Error ? error.message : String(error)}`);
        }
      });

      console.log(`Parsed row ${index + 2}:`, row);
      return row as T;
    });
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw error;
  }
}
