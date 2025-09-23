
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileAudio } from 'lucide-react';
import { formatBytes } from '@/utils/formatUtils';
import { AdminTableShell } from '@/components/admin/AdminTableShell';

interface AdminRecording {
  id: string;
  title: string;
  user_id: string;
  status: string;
  created_at: string;
  file_size: number;
  file_type: string;
  user_email: string;
  user_name: string;
}

interface RecordingsTableProps {
  recordings: AdminRecording[];
  loading: boolean;
}

export default function RecordingsTable({ recordings, loading }: RecordingsTableProps) {
  const title = recordings.length > 0 ? `All Recordings (${recordings.length})` : 'All Recordings';

  return (
    <AdminTableShell
      title={title}
      description="Complete list of user recordings"
      icon={FileAudio}
      loading={loading}
      empty={!loading && recordings.length === 0}
      emptyTitle="No recordings found"
      emptyDescription="No recordings have been uploaded yet."
    >
      <Table>
          <TableHeader>
            <TableRow className="border-eci-gray-200">
              <TableHead className="text-body-small font-medium text-eci-gray-700">Title</TableHead>
              <TableHead className="text-body-small font-medium text-eci-gray-700">User</TableHead>
              <TableHead className="text-body-small font-medium text-eci-gray-700">Status</TableHead>
              <TableHead className="text-body-small font-medium text-eci-gray-700">Created</TableHead>
              <TableHead className="text-body-small font-medium text-eci-gray-700">Size</TableHead>
              <TableHead className="text-body-small font-medium text-eci-gray-700">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recordings.map((recording) => (
              <TableRow key={recording.id} className="border-eci-gray-200 hover:bg-eci-gray-50">
                <TableCell className="text-body text-eci-gray-900 font-medium">
                  {recording.title}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="text-body text-eci-gray-900">{recording.user_name}</div>
                    <div className="text-body-small text-eci-gray-600">{recording.user_email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={recording.status === 'completed' ? 'default' : 'secondary'}
                    className={recording.status === 'completed' 
                      ? "bg-eci-teal/10 text-eci-teal border-eci-teal/20" 
                      : "bg-eci-gray-100 text-eci-gray-700 border-eci-gray-200"
                    }
                  >
                    {recording.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-body text-eci-gray-900">
                  {new Date(recording.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-body text-eci-gray-900">
                  {formatBytes(Number(recording.file_size) || 0)}
                </TableCell>
                <TableCell className="text-body text-eci-gray-900">
                  {recording.file_type || 'Unknown'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </AdminTableShell>
  );
}
