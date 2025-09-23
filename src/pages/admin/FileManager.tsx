import React, { useState, useCallback, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, File, Folder, Trash2, Download, Move, Search, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  modified: string;
  path: string;
  bucket_id?: string;
  metadata?: any;
  public_url?: string;
}

export default function FileManager() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  // Function to fetch files from Supabase storage
  const fetchFiles = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch files from recordings bucket
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('recordings')
        .list(user.id, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'updated_at', order: 'desc' }
        });

      if (storageError) {
        throw storageError;
      }

      // Transform storage files to FileItem format
      const transformedFiles: FileItem[] = storageFiles?.map(file => ({
        id: file.id || file.name,
        name: file.name,
        type: file.metadata?.mimetype?.startsWith('audio/') || file.metadata?.mimetype?.startsWith('video/') ? 'file' : 'file',
        size: file.metadata?.size,
        modified: file.updated_at || file.created_at,
        path: currentPath,
        bucket_id: 'recordings',
        metadata: file.metadata,
        public_url: file.name ? supabase.storage.from('recordings').getPublicUrl(`${user.id}/${file.name}`).data.publicUrl : undefined
      })) || [];

      // Add folder structure (simulate folders for organization)
      const folders: FileItem[] = [
        { id: 'recordings-folder', name: 'recordings', type: 'folder', modified: new Date().toISOString(), path: '/' },
        { id: 'transcripts-folder', name: 'transcripts', type: 'folder', modified: new Date().toISOString(), path: '/' },
        { id: 'exports-folder', name: 'exports', type: 'folder', modified: new Date().toISOString(), path: '/' }
      ];

      if (currentPath === '/') {
        setFiles([...folders, ...transformedFiles]);
      } else {
        setFiles(transformedFiles);
      }

    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, currentPath, toast]);

  // Load files on component mount and when user changes
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || !user) {
      toast({
        title: "Error",
        description: "Please log in to upload files",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      const uploadPromises = Array.from(uploadedFiles).map(async (file) => {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { data, error } = await supabase.storage
          .from('recordings')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          throw error;
        }

        return { fileName, filePath, size: file.size };
      });

      const results = await Promise.all(uploadPromises);
      
      toast({
        title: "Files uploaded",
        description: `${results.length} file(s) uploaded successfully`
      });

      // Refresh the file list
      await fetchFiles();
      
      // Clear the input
      e.target.value = '';
      
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload files",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  }, [user, toast, fetchFiles]);

  const handleDelete = useCallback(async (fileId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to delete files",
        variant: "destructive"
      });
      return;
    }

    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) {
      toast({
        title: "Error",
        description: "File not found",
        variant: "destructive"
      });
      return;
    }

    if (fileToDelete.type === 'folder') {
      toast({
        title: "Error",
        description: "Cannot delete folders in this interface",
        variant: "destructive"
      });
      return;
    }

    try {
      const filePath = `${user.id}/${fileToDelete.name}`;
      
      const { error } = await supabase.storage
        .from('recordings')
        .remove([filePath]);

      if (error) {
        throw error;
      }

      toast({
        title: "File deleted",
        description: "File has been removed successfully"
      });

      // Refresh the file list
      await fetchFiles();
      
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
        variant: "destructive"
      });
    }
  }, [user, files, toast, fetchFiles]);

  const handleMove = useCallback(async (fileId: string, newPath: string) => {
    // For now, we'll disable the move functionality as it's complex with Supabase storage
    // In a real implementation, this would involve copying the file to a new location and deleting the old one
    toast({
      title: "Feature not available",
      description: "File moving is not currently supported",
      variant: "destructive"
    });
  }, [toast]);

  const handleDownload = useCallback(async (fileId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to download files",
        variant: "destructive"
      });
      return;
    }

    const fileToDownload = files.find(f => f.id === fileId);
    if (!fileToDownload || fileToDownload.type === 'folder') {
      toast({
        title: "Error",
        description: "Cannot download this item",
        variant: "destructive"
      });
      return;
    }

    try {
      const filePath = `${user.id}/${fileToDownload.name}`;
      
      const { data, error } = await supabase.storage
        .from('recordings')
        .download(filePath);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileToDownload.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "File download has begun"
      });
      
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download failed",
        description: error.message || "Failed to download file",
        variant: "destructive"
      });
    }
  }, [user, files, toast]);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file => 
    file.path === currentPath && 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-display text-eci-gray-900 mb-2">File Manager</h1>
            <p className="text-body text-eci-gray-600">Upload, organize, and manage files with real Supabase Storage</p>
            {!user && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <p className="text-body-small text-amber-800">Please log in to manage files</p>
              </div>
            )}
            {loading && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <p className="text-body-small text-blue-800">Loading files...</p>
              </div>
            )}
          </div>

          <Card className="bg-white shadow-sm">
            <div className="p-6">
              {/* Toolbar */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <label className={`cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={handleUpload}
                      disabled={uploading || !user}
                      accept="audio/*,video/*,.mp3,.mp4,.wav,.m4a"
                    />
                    <Button variant="default" className="flex items-center gap-2" disabled={uploading || !user}>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploading ? 'Uploading...' : 'Upload Files'}
                    </Button>
                  </label>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    New Folder
                  </Button>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-eci-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Path breadcrumb */}
              <div className="flex items-center gap-2 text-body-small text-eci-gray-600 mb-4">
                <span>Current path:</span>
                <span className="font-medium text-eci-gray-900">{currentPath}</span>
              </div>

              {/* Files table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-eci-gray-200">
                      <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Name</th>
                      <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Size</th>
                      <th className="text-left py-3 px-4 text-caption font-medium text-eci-gray-600">Modified</th>
                      <th className="text-right py-3 px-4 text-caption font-medium text-eci-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-eci-gray-400" />
                            <span className="text-body text-eci-gray-500">Loading files...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredFiles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center">
                          <span className="text-body text-eci-gray-500">
                            {!user ? 'Please log in to view files' : 'No files found'}
                          </span>
                        </td>
                      </tr>
                    ) : (
                      filteredFiles.map((file) => (
                      <tr key={file.id} className="border-b border-eci-gray-100 hover:bg-eci-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {file.type === 'folder' ? (
                              <Folder className="h-4 w-4 text-blue-500" />
                            ) : (
                              <File className="h-4 w-4 text-eci-gray-400" />
                            )}
                            <button
                              className="text-body text-eci-gray-900 hover:text-eci-red"
                              onClick={() => file.type === 'folder' && setCurrentPath(`${currentPath}${file.name}/`)}
                            >
                              {file.name}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-body text-eci-gray-600">{formatBytes(file.size)}</td>
                        <td className="py-3 px-4 text-body text-eci-gray-600">
                          {new Date(file.modified).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {file.type === 'file' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Download"
                                onClick={() => handleDownload(file.id)}
                                disabled={!user}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Move (Not Available)"
                              onClick={() => handleMove(file.id, '/moved/')}
                              disabled={true}
                            >
                              <Move className="h-4 w-4" />
                            </Button>
                            {file.type === 'file' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                title="Delete"
                                onClick={() => handleDelete(file.id)}
                                disabled={!user}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}