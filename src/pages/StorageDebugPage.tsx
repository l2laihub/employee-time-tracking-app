import StorageDebugger from '../components/debug/StorageDebugger';
import { Card } from '../components/design-system';

export default function StorageDebugPage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="p-4 mb-6">
        <h1 className="text-2xl font-bold mb-2">Storage Debugging</h1>
        <p className="text-gray-600">
          Use this page to diagnose Supabase storage issues.
        </p>
      </Card>
      
      <StorageDebugger />
    </div>
  );
}
