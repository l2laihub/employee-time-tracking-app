import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, Button } from '../design-system';

interface Bucket {
  id: string;
  name: string;
  public: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function StorageDebugger() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchBuckets = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        throw error;
      }
      
      setBuckets(data || []);
      console.log('Available buckets:', data);
    } catch (err: unknown) {
      console.error('Error fetching buckets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch buckets');
    } finally {
      setLoading(false);
    }
  };

  const testUpload = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      // Create a small test file
      const testBlob = new Blob(['test content'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });
      
      // Try to upload to employee-photos bucket
      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload('test/debug-file.txt', testFile, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get URL of uploaded file
      const { data } = supabase.storage
        .from('employee-photos')
        .getPublicUrl('test/debug-file.txt');
        
      setTestResult(`Test file uploaded successfully! URL: ${data.publicUrl}`);
      
      // Clean up by removing the test file
      await supabase.storage
        .from('employee-photos')
        .remove(['test/debug-file.txt']);
        
    } catch (err: unknown) {
      console.error('Test upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload test file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 max-w-2xl mx-auto my-4">
      <h2 className="text-xl font-bold mb-4">Storage Debugger</h2>
      
      <div className="flex gap-2 mb-4">
        <Button onClick={fetchBuckets} disabled={loading}>
          {loading ? 'Loading...' : 'List Buckets'}
        </Button>
        <Button onClick={testUpload} disabled={loading}>
          {loading ? 'Testing...' : 'Test Upload'}
        </Button>
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-800 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {testResult && (
        <div className="p-3 bg-green-100 text-green-800 rounded mb-4">
          {testResult}
        </div>
      )}
      
      {buckets.length > 0 && (
        <div>
          <h3 className="font-bold mt-4 mb-2">Available Buckets:</h3>
          <ul className="list-disc pl-5">
            {buckets.map((bucket) => (
              <li key={bucket.id} className="mb-1">
                <strong>{bucket.name}</strong> (ID: {bucket.id})
                {bucket.public ? ' - Public' : ' - Private'}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p>This component helps debug Supabase storage issues.</p>
        <p>Use the buttons above to test storage functionality.</p>
      </div>
    </Card>
  );
}
