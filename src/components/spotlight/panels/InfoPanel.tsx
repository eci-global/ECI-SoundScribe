import React, { useState } from 'react';
import { Info, Calendar, Clock, User, FileAudio, Zap, Tag, CheckCircle, AlertCircle, RefreshCw, Star, Link as LinkIcon } from 'lucide-react';
import { formatDuration } from '@/utils/mediaDuration';
import { parseECIAnalysis, hasECIAnalysis, getECIOverallScore, getECIEscalationRisk } from '@/utils/eciAnalysis';
import { useSupportMode } from '@/contexts/SupportContext';
import type { Recording } from '@/types/recording';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InfoPanelProps {
  recording?: Recording | null;
}

export default function InfoPanel({ recording }: InfoPanelProps) {
  const { toast } = useToast();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const supportMode = useSupportMode();
  const eciAnalysis = recording ? parseECIAnalysis(recording) : null;
  const isSupport = recording?.content_type === 'customer_support' || recording?.content_type === 'support_call' || supportMode.supportMode;

  if (!recording) {
    return (
      <div className="text-center py-8">
        <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No recording selected</p>
        <p className="text-xs text-gray-400 mt-1">Recording details will appear here</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'uploading':
        return <RefreshCw className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'uploading':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const contentTypeLabels = {
    'sales_call': 'Sales Call',
    'customer_support': 'Customer Support',
    'team_meeting': 'Team Meeting',
    'training_session': 'Training Session',
    'other': 'General Recording'
  };

  return (
    <div className="space-y-6">
      {/* Recording Details */}
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-eci-blue" />
          Recording Details
        </h3>
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Title</label>
            <p className="text-sm text-gray-900 mt-1">{recording.title || 'Untitled Recording'}</p>
          </div>

          {recording.description && (
            <div>
              <label className="text-sm font-medium text-gray-600">Description</label>
              <p className="text-sm text-gray-700 mt-1">{recording.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Created
              </label>
              <p className="text-sm text-gray-900 mt-1">{formatDate(recording.created_at)}</p>
            </div>

            {recording.updated_at && recording.updated_at !== recording.created_at && (
              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last Updated
                </label>
                <p className="text-sm text-gray-900 mt-1">{formatDate(recording.updated_at)}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Technical Information */}
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FileAudio className="w-4 h-4 text-purple-500" />
          Technical Details
        </h3>
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Duration</label>
              <p className="text-sm text-gray-900 mt-1">{formatDuration(recording.duration || 0)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">File Type</label>
              <p className="text-sm text-gray-900 mt-1 capitalize">{recording.file_type || 'Unknown'}</p>
            </div>

            {recording.file_size && (
              <div>
                <label className="text-sm font-medium text-gray-600">File Size</label>
                <p className="text-sm text-gray-900 mt-1">{formatFileSize(recording.file_size)}</p>
              </div>
            )}

            {recording.content_type && (
              <div>
                <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Content Type
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {contentTypeLabels[recording.content_type as keyof typeof contentTypeLabels] || recording.content_type}
                </p>
              </div>
            )}
          </div>

          {recording.content_type && (
            <div>
              <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                AI Coaching
              </label>
              <p className="text-sm text-gray-900 mt-1">
                {recording.enable_coaching ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Processing Status */}
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {getStatusIcon(recording.status)}
          Processing Status
        </h3>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor(recording.status)}`}>
            {getStatusIcon(recording.status)}
            <span className="text-sm font-medium capitalize">{recording.status}</span>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Transcript Available</span>
              <span className={`font-medium ${recording.transcript ? 'text-green-600' : 'text-gray-400'}`}>
                {recording.transcript ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">AI Summary</span>
              <span className={`font-medium ${recording.ai_summary ? 'text-green-600' : 'text-gray-400'}`}>
                {recording.ai_summary ? 'Generated' : 'Not available'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">AI Insights</span>
              <span className={`font-medium ${recording.ai_insights ? 'text-green-600' : 'text-gray-400'}`}>
                {recording.ai_insights ? 'Available' : 'Not available'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Next Steps</span>
              <span className={`font-medium ${recording.ai_next_steps ? 'text-green-600' : 'text-gray-400'}`}>
                {recording.ai_next_steps ? 'Generated' : 'Not available'}
              </span>
            </div>

            {/* Employee Linking Status */}
            <div className="flex justify-between">
              <span className="text-gray-600 flex items-center gap-1">
                <User className="w-3 h-3" />
                Employee Linking
              </span>
              {(() => {
                const participationCount = (recording as any).employee_participation_count || 0;
                const pending = (recording as any).employee_linking_pending === true;
                const linked = participationCount > 0;
                const label = linked ? 'Linked' : pending ? 'Pending' : 'Not linked';
                const color = linked ? 'text-green-600' : pending ? 'text-yellow-600' : 'text-gray-400';
                return (
                  <div className="flex items-center gap-2">
                    <span className={`font-medium capitalize ${color}`}>{label}</span>
                    {!linked && (
                      <button
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                        onClick={() => setLinkOpen(v => !v)}
                        type="button"
                        title="Link employee to this recording"
                      >
                        <LinkIcon className="w-3 h-3" /> Link
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {linkOpen && recording?.id && (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md space-y-2">
                <label className="text-xs text-gray-600">Employee ID (UUID)</label>
                <input
                  type="text"
                  placeholder="0af5b943-ff7f-492f-ad95-ed4e572ead5a"
                  className="w-full text-sm px-2 py-1 border rounded-md"
                  value={employeeIdInput}
                  onChange={(e) => setEmployeeIdInput(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={linking || !employeeIdInput}
                    className={`text-xs px-3 py-1 rounded-md ${linking ? 'bg-gray-200 text-gray-500' : 'bg-eci-blue text-white hover:bg-eci-blue/90'}`}
                    onClick={async () => {
                      if (!employeeIdInput) return;
                      setLinking(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('assign-employee-to-recording', {
                          body: { recording_id: recording.id, employee_id: employeeIdInput }
                        });
                        if (error) throw error;
                        toast({ title: 'Employee linked', description: `Linked to ${data?.employee_name || 'employee'}` });
                        setLinkOpen(false);
                        // best-effort refresh by emitting a custom event; parent uses onRecordingUpdate
                        try { window.dispatchEvent(new CustomEvent('recording-updated')); } catch {}
                      } catch (err: any) {
                        toast({ title: 'Link failed', description: err?.message || String(err), variant: 'destructive' });
                      } finally {
                        setLinking(false);
                      }
                    }}
                  >
                    {linking ? 'Linking...' : 'Link Employee'}
                  </button>
                  <button type="button" className="text-xs px-3 py-1 rounded-md border" onClick={() => setLinkOpen(false)}>Cancel</button>
                </div>
                <p className="text-[11px] text-gray-500">Paste the employee UUID from the employees table. This will create a participation record and generate a scorecard if missing.</p>
              </div>
            )}

            {recording.enable_coaching && (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {isSupport ? 'ECI Quality Analysis' : 'Coaching Analysis'}
                </span>
                <span className={`font-medium ${recording.coaching_evaluation ? 'text-green-600' : 'text-gray-400'}`}>
                  {recording.coaching_evaluation ? 'Complete' : 'Pending'}
                </span>
              </div>
            )}

            {/* ECI Analysis Status for Support Recordings */}
            {isSupport && eciAnalysis && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Star className="w-3 h-3 text-blue-600" />
                    ECI Framework Score
                  </span>
                  <span className="font-medium text-blue-600">
                    {getECIOverallScore(eciAnalysis)}%
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Escalation Risk</span>
                  <span className={`font-medium capitalize ${
                    getECIEscalationRisk(eciAnalysis) === 'low' ? 'text-green-600' :
                    getECIEscalationRisk(eciAnalysis) === 'medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {getECIEscalationRisk(eciAnalysis)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Manager Review</span>
                  <span className={`font-medium ${eciAnalysis.summary.managerReviewRequired ? 'text-orange-600' : 'text-green-600'}`}>
                    {eciAnalysis.summary.managerReviewRequired ? 'Required' : 'Not Needed'}
                  </span>
                </div>
              </>
            )}
          </div>

          {recording.ai_generated_at && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">AI Processing Completed</span>
                <span className="text-gray-900">{formatDate(recording.ai_generated_at)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-eci-red" />
          Quick Actions
        </h3>
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          {recording.file_url && (
            <button 
              onClick={() => window.open(recording.file_url, '_blank')}
              className="w-full text-left px-3 py-2 text-sm bg-eci-blue/10 text-eci-blue rounded-lg hover:bg-eci-blue/20 transition-colors"
            >
              Download Original File
            </button>
          )}

          {recording.transcript && (
            <button 
              onClick={() => {
                const blob = new Blob([recording.transcript!], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${recording.title || 'transcript'}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full text-left px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            >
              Export Transcript
            </button>
          )}

          {(recording.ai_summary || recording.summary) && (
            <button 
              onClick={() => {
                const summary = recording.ai_summary || recording.summary!;
                const blob = new Blob([summary], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${recording.title || 'summary'}-summary.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full text-left px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
            >
              Export Summary
            </button>
          )}
        </div>
      </section>

      {/* Help Section */}
      <section>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-gray-500" />
          Need Help?
        </h3>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm">
          <p className="text-gray-700 mb-2">
            Having trouble with this recording? Here are some helpful resources:
          </p>
          <ul className="space-y-1 text-gray-600">
            <li>• <a href="#" className="text-eci-blue hover:underline">Recording Quality Guidelines</a></li>
            <li>• <a href="#" className="text-eci-blue hover:underline">AI Processing FAQ</a></li>
            <li>• <a href="#" className="text-eci-blue hover:underline">Contact Support</a></li>
          </ul>
          <div className="mt-3 pt-3 border-t border-gray-300">
            <p className="text-xs text-gray-500">
              <strong>Recording ID:</strong> {recording.id}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
