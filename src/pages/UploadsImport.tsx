import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, Calendar, Settings, Activity, Clock, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileOperations } from '@/hooks/useFileOperations';
import { useImportOperations } from '@/hooks/useImportOperations';
import UploadModal from '@/components/dashboard/UploadModal';
import BulkUploadModal from '@/components/dashboard/BulkUploadModal';
import ImportModal from '@/components/dashboard/ImportModal';
import StandardLayout from '@/components/layout/StandardLayout';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Recording } from '@/types/recording';

export default function UploadsImport() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const navigate = useNavigate();
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'queue' | 'import'>(
    tabParam === 'queue' ? 'queue' : tabParam === 'import' ? 'import' : 'upload'
  );
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const { handleUpload } = useFileOperations({
    onRecordingProcessed: () => {
      console.log('Recording processed');
      setShowUploadModal(false);
      setShowBulkUploadModal(false);
      // Refresh queue if we're on that tab
      if (activeTab === 'queue') {
        fetchProcessingRecordings();
      }
    }
  });

  const { handleImport } = useImportOperations({
    onImportCompleted: () => {
      console.log('Import completed');
      setShowImportModal(false);
    }
  });

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchProcessingRecordings();
      
      // Set up real-time subscription
      const subscription = supabase
        .channel('recordings-processing')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'recordings' },
          () => fetchProcessingRecordings()
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [activeTab]);

  const fetchProcessingRecordings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .in('status', ['uploading', 'processing', 'failed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Properly type the data to match Recording interface
      const typedRecordings: Recording[] = (data || []).map(record => ({
        ...record,
        file_type: record.file_type as 'audio' | 'video',
        status: record.status as 'uploading' | 'processing' | 'completed' | 'failed',
        coaching_evaluation: record.coaching_evaluation 
          ? (typeof record.coaching_evaluation === 'string' 
              ? JSON.parse(record.coaching_evaluation) 
              : record.coaching_evaluation) as any
          : undefined
      }));
      
      setRecordings(typedRecordings);
    } catch (error) {
      console.error('Error fetching processing recordings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch processing queue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Activity className="w-5 h-5 text-eci-blue animate-spin" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-eci-teal animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-eci-red" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-eci-teal" />;
      default:
        return <FileText className="w-5 h-5 text-eci-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'processing': return 'Processing...';
      case 'failed': return 'Failed';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const uploadOptions = [
    {
      title: 'Upload Audio/Video Files',
      description: 'Upload your audio or video recordings directly',
      icon: Upload,
      action: () => setShowUploadModal(true),
      formats: 'MP3, WAV, MP4, MOV, AVI, MKV up to 2GB'
    },
    {
      title: 'Bulk Upload',
      description: 'Upload multiple files at once with drag & drop',
      icon: FileText,
      action: () => setShowBulkUploadModal(true),
      formats: 'Multiple files supported'
    }
  ];

  const importOptions = [
    {
      title: 'Import from Outreach',
      description: 'Connect to Outreach.io and import call recordings',
      icon: ExternalLink,
      action: () => navigate('/integrations/outreach/import'),
      status: 'Available'
    },
    {
      title: 'Import from Salesforce',
      description: 'Import recordings from Salesforce call logs',
      icon: Calendar,
      action: () => console.log('Salesforce import'),
      status: 'Coming Soon'
    },
    {
      title: 'Import from Gong',
      description: 'Import existing recordings from Gong platform',
      icon: Settings,
      action: () => console.log('Gong import'),
      status: 'Coming Soon'
    }
  ];

  return (
    <StandardLayout activeSection="uploads">
      <div className="min-h-screen bg-eci-light-gray">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-800 mb-2">Uploads & Import</h1>
            <p className="text-body-large text-eci-gray-600">
              Upload new recordings or import from external platforms
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-eci-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('upload')}
                className={cn(
                  "px-6 py-2 rounded-lg text-body-small font-medium transition-all duration-150",
                  activeTab === 'upload'
                    ? "bg-white text-eci-gray-800 shadow-sm"
                    : "text-eci-gray-600 hover:text-eci-gray-800"
                )}
              >
                Upload Files
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={cn(
                  "px-6 py-2 rounded-lg text-body-small font-medium transition-all duration-150 flex items-center",
                  activeTab === 'queue'
                    ? "bg-white text-eci-gray-800 shadow-sm"
                    : "text-eci-gray-600 hover:text-eci-gray-800"
                )}
              >
                <Activity className="w-4 h-4 mr-1" /> Queue
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={cn(
                  "px-6 py-2 rounded-lg text-body-small font-medium transition-all duration-150",
                  activeTab === 'import'
                    ? "bg-white text-eci-gray-800 shadow-sm"
                    : "text-eci-gray-600 hover:text-eci-gray-800"
                )}
              >
                Import from Platforms
              </button>
            </div>
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {uploadOptions.map((option, index) => (
                <div
                  key={index}
                  onClick={option.action}
                  className="bg-white rounded-lg shadow-sm border border-eci-gray-200 p-6 hover:shadow-md transition-all duration-150 cursor-pointer group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-eci-red/10 rounded-lg group-hover:bg-eci-red/20 transition-colors">
                      <option.icon className="w-6 h-6 text-eci-red" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-title-small text-eci-gray-800 mb-2">{option.title}</h3>
                      <p className="text-body-small text-eci-gray-600 mb-3">{option.description}</p>
                      <div className="inline-flex items-center px-3 py-1 bg-eci-gray-100 rounded-lg">
                        <span className="text-caption text-eci-gray-600">{option.formats}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Queue Tab */}
          {activeTab === 'queue' && (
            <div className="bg-white rounded-lg shadow-sm border border-eci-gray-200 p-6">
              <h2 className="text-title text-eci-gray-800 mb-4">Processing Queue</h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-eci-blue" />
                  <p className="text-eci-gray-600">Loading processing queue...</p>
                </div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-eci-gray-200 rounded-lg">
                  <FileText className="w-12 h-12 text-eci-gray-400 mx-auto mb-4" strokeWidth={1.5} />
                  <p className="text-eci-gray-600 mb-2">No recordings currently processing</p>
                  <p className="text-eci-gray-500 text-sm">Upload files to see them appear here</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-eci-gray-200">
                  <table className="min-w-full divide-y divide-eci-gray-200">
                    <thead className="bg-eci-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-eci-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-eci-gray-500 uppercase tracking-wider">Title</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-eci-gray-500 uppercase tracking-wider">Type</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-eci-gray-500 uppercase tracking-wider">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-eci-gray-200">
                      {recordings.map((recording) => (
                        <tr 
                          key={recording.id} 
                          className="hover:bg-eci-gray-50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(recording.status)}
                              <span className="ml-2 text-sm text-eci-gray-700">{getStatusText(recording.status)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-eci-gray-900">{recording.title || 'Untitled Recording'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-eci-gray-700">{recording.file_type?.toUpperCase() || 'Unknown'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-eci-gray-500">
                            {formatDate(recording.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {importOptions.map((option, index) => (
                <div
                  key={index}
                  onClick={option.status === 'Available' ? option.action : undefined}
                  className={cn(
                    "bg-white rounded-lg shadow-sm border border-eci-gray-200 p-6 transition-all duration-150",
                    option.status === 'Available' 
                      ? "hover:shadow-md cursor-pointer group" 
                      : "opacity-75 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start space-x-4">
                    <div className={cn(
                      "p-3 rounded-lg transition-colors",
                      option.status === 'Available'
                        ? "bg-eci-teal/10 group-hover:bg-eci-teal/20"
                        : "bg-eci-gray-100"
                    )}>
                      <option.icon className={cn(
                        "w-6 h-6",
                        option.status === 'Available' ? "text-eci-teal" : "text-eci-gray-400"
                      )} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-title-small text-eci-gray-800 mb-2">{option.title}</h3>
                      <p className="text-body-small text-eci-gray-600 mb-3">{option.description}</p>
                      <div className={cn(
                        "inline-flex items-center px-3 py-1 rounded-lg",
                        option.status === 'Available'
                          ? "bg-eci-teal/10 text-eci-teal"
                          : "bg-eci-gray-100 text-eci-gray-500"
                      )}>
                        <span className="text-caption font-medium">{option.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Help Section */}
          <div className="mt-12 bg-white rounded-lg shadow-sm border border-eci-gray-200 p-6">
            <h3 className="text-title text-eci-gray-800 mb-4">Need Help?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-title-small text-eci-gray-700 mb-2">Supported Formats</h4>
                  <ul className="text-body-small text-eci-gray-600 space-y-1">
                    <li>• Audio: MP3, WAV, M4A, FLAC, OGG, AAC</li>
                    <li>• Video: MP4, MOV, AVI, MKV, WEBM</li>
                    <li>• Maximum file size: 2GB</li>
                    <li>• Files over 50MB use optimized processing</li>
                    <li>• Large files (&gt;200MB) use Azure backend</li>
                  </ul>
                </div>
              <div>
                <h4 className="text-title-small text-eci-gray-700 mb-2">Import Requirements</h4>
                <ul className="text-body-small text-eci-gray-600 space-y-1">
                  <li>• Valid platform API credentials</li>
                  <li>• Appropriate permissions for data access</li>
                  <li>• Active subscription to source platform</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
              {showUploadModal && (
          <UploadModal
            open={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onUpload={handleUpload}
          />
        )}

        {showBulkUploadModal && (
          <BulkUploadModal
            open={showBulkUploadModal}
            onClose={() => setShowBulkUploadModal(false)}
            onUpload={handleUpload}
          />
        )}

        {showImportModal && (
        <ImportModal
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
        />
      )}
    </StandardLayout>
  );
}
