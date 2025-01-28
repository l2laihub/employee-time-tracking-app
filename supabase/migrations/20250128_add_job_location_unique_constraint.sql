-- Create a function to normalize strings for comparison
CREATE OR REPLACE FUNCTION normalize_string(input text)
RETURNS text AS $$
DECLARE
  normalized text;
BEGIN
  -- If input is null or empty, return empty string
  IF input IS NULL OR trim(input) = '' THEN
    RETURN '';
  END IF;

  -- Convert to lowercase and normalize whitespace
  normalized := lower(regexp_replace(trim(input), '\s+', ' ', 'g'));
  
  -- Remove common address punctuation
  normalized := regexp_replace(normalized, '[.,#-]', '', 'g');
  
  -- Remove common street type variations
  normalized := regexp_replace(normalized, '\m(street|st|avenue|ave|boulevard|blvd|road|rd|lane|ln|drive|dr)\M', '', 'gi');
  
  -- Final trim in case removing terms left extra spaces
  RETURN trim(normalized);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop existing index if it exists
DROP INDEX IF EXISTS job_locations_name_address_unique;

-- Add a unique index using the normalized values
CREATE UNIQUE INDEX job_locations_name_address_unique 
ON job_locations (
  organization_id,
  normalize_string(name),
  normalize_string(COALESCE(address, '')),
  normalize_string(COALESCE(city, '')),
  normalize_string(COALESCE(state, '')),
  normalize_string(COALESCE(zip, ''))
);

-- Add a comment explaining the index
COMMENT ON INDEX job_locations_name_address_unique IS 
'Ensures unique job locations within an organization based on normalized name and address fields. Normalization includes:
- Converting to lowercase
- Removing extra whitespace
- Removing common address punctuation
- Removing common street type variations';
