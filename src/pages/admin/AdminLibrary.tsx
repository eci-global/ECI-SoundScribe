
import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/AdminCard';
import RecordingsTable from '@/components/admin/RecordingsTable';
import { useAdminRecordings } from '@/hooks/useAdminRecordings';
import { Button } from '@/components/ui/button';
import { Upload, Search, Filter, Download } from 'lucide-react';

export default function AdminLibrary() {
  const { recordings, loading: recordingsLoading } = useAdminRecordings();

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">Content Library</h1>
            <p className="text-body text-eci-gray-600">Manage uploaded recordings and files</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 flex flex-wrap gap-3">
            <Button className="bg-eci-violet hover:bg-eci-violet-light text-white">
              <Upload className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Upload Files
            </Button>
            <Button variant="outline" className="border-eci-gray-300 text-eci-gray-700 hover:bg-eci-gray-50">
              <Search className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Advanced Search
            </Button>
            <Button variant="outline" className="border-eci-gray-300 text-eci-gray-700 hover:bg-eci-gray-50">
              <Filter className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Filter
            </Button>
            <Button variant="outline" className="border-eci-gray-300 text-eci-gray-700 hover:bg-eci-gray-50">
              <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Export
            </Button>
          </div>

          {/* Library Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <AdminCard title="Total Recordings" className="text-center">
              <div className="text-display text-eci-violet font-bold">{recordings.length}</div>
              <p className="text-body-small text-eci-gray-600 mt-1">All recordings</p>
            </AdminCard>
            
            <AdminCard title="Storage Used" className="text-center">
              <div className="text-display text-eci-teal font-bold">2.4 GB</div>
              <p className="text-body-small text-eci-gray-600 mt-1">of 10 GB limit</p>
            </AdminCard>
            
            <AdminCard title="This Month" className="text-center">
              <div className="text-display text-eci-blue font-bold">42</div>
              <p className="text-body-small text-eci-gray-600 mt-1">new uploads</p>
            </AdminCard>
            
            <AdminCard title="Processing" className="text-center">
              <div className="text-display text-eci-red font-bold">3</div>
              <p className="text-body-small text-eci-gray-600 mt-1">in queue</p>
            </AdminCard>
          </div>

          {/* Recordings Table */}
          <AdminCard 
            title="All Recordings" 
            description="Manage and organize uploaded content"
          >
            <RecordingsTable recordings={recordings} loading={recordingsLoading} />
          </AdminCard>
        </div>
      </div>
    </AdminLayout>
  );
}
