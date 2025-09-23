import React, { useState, useMemo } from 'react';
import { Paperclip, FileText, Download, Upload, Plus, ExternalLink, Calendar, FileAudio, FileVideo } from 'lucide-react';
import type { Recording } from '@/types/recording';

interface AttachmentsPanelProps {
  recording?: Recording | null;
}

interface Attachment {
  id: string;
  name: string;
  type: 'document' | 'link' | 'generated' | 'original';
  url: string;
  size?: string;
  createdAt: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function AttachmentsPanel({ recording }: AttachmentsPanelProps) {
  const [isUploading, setIsUploading] = useState(false);

  // Generate dynamic attachments based on the recording
  const attachments = useMemo((): Attachment[] => {
    if (!recording) return [];

    const items: Attachment[] = [];

    // Original recording file
    if (recording.file_url) {
      items.push({
        id: 'original-file',
        name: `${recording.title || 'Recording'}.${recording.file_type === 'audio' ? 'mp3' : 'mp4'}`,
        type: 'original',
        url: recording.file_url,
        size: recording.file_size ? `${(recording.file_size / (1024 * 1024)).toFixed(1)} MB` : undefined,
        createdAt: recording.created_at,
        description: 'Original recording file',
        icon: recording.file_type === 'audio' ? FileAudio : FileVideo
      });
    }

    // Generated transcript
    if (recording.transcript) {
      items.push({
        id: 'transcript',
        name: 'Transcript.txt',
        type: 'generated',
        url: '#',
        createdAt: recording.ai_generated_at || recording.updated_at || recording.created_at,
        description: 'AI-generated transcript',
        icon: FileText
      });
    }

    // AI Summary
    if (recording.ai_summary) {
      items.push({
        id: 'ai-summary',
        name: 'AI Summary.txt',
        type: 'generated',
        url: '#',
        createdAt: recording.ai_generated_at || recording.updated_at || recording.created_at,
        description: 'AI-generated summary and insights',
        icon: FileText
      });
    }

    // Next Steps document
    if (recording.ai_next_steps) {
      items.push({
        id: 'next-steps',
        name: 'Action Items.txt',
        type: 'generated',
        url: '#',
        createdAt: recording.ai_generated_at || recording.updated_at || recording.created_at,
        description: 'AI-identified action items and next steps',
        icon: FileText
      });
    }

    // Coaching Evaluation
    if (recording.coaching_evaluation) {
      items.push({
        id: 'coaching-report',
        name: 'Coaching Report.pdf',
        type: 'generated',
        url: '#',
        createdAt: recording.ai_generated_at || recording.updated_at || recording.created_at,
        description: 'Performance coaching analysis',
        icon: FileText
      });
    }

    // Add some contextual suggested attachments based on content type
    const contentType = recording.content_type;
    if (contentType === 'sales_call') {
      items.push(
        {
          id: 'follow-up-template',
          name: 'Follow-up Email Template.txt',
          type: 'generated',
          url: '#',
          createdAt: new Date().toISOString(),
          description: 'Suggested follow-up email based on call content',
          icon: FileText
        },
        {
          id: 'proposal-template',
          name: 'Proposal Template.docx',
          type: 'document',
          url: '#',
          createdAt: new Date().toISOString(),
          description: 'Standard proposal template for this prospect',
          icon: FileText
        }
      );
    } else if (contentType === 'customer_support') {
      items.push({
        id: 'resolution-summary',
        name: 'Resolution Summary.txt',
        type: 'generated',
        url: '#',
        createdAt: new Date().toISOString(),
        description: 'Summary of issues and resolutions discussed',
        icon: FileText
      });
    } else if (contentType === 'team_meeting') {
      items.push({
        id: 'meeting-minutes',
        name: 'Meeting Minutes.docx',
        type: 'generated',
        url: '#',
        createdAt: new Date().toISOString(),
        description: 'Structured meeting minutes with action items',
        icon: FileText
      });
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [recording]);

  const handleDownload = (attachment: Attachment) => {
    if (attachment.type === 'original' && attachment.url !== '#') {
      window.open(attachment.url, '_blank');
      return;
    }

    // Handle generated files
    let content = '';
    const filename = attachment.name;
    
    switch (attachment.id) {
      case 'transcript':
        content = recording?.transcript || '';
        break;
      case 'ai-summary':
        content = recording?.ai_summary || '';
        break;
      case 'next-steps':
        content = recording?.ai_next_steps ? JSON.stringify(recording.ai_next_steps, null, 2) : '';
        break;
      case 'follow-up-template':
        content = generateFollowUpTemplate();
        break;
      case 'resolution-summary':
        content = generateResolutionSummary();
        break;
      case 'meeting-minutes':
        content = generateMeetingMinutes();
        break;
      default:
        content = 'Generated content not available';
    }

    if (content) {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const generateFollowUpTemplate = () => {
    return `Subject: Great connecting today - Next steps

Hi [Name],

Thank you for taking the time to speak with me today about [Topic]. I really enjoyed our conversation and learning more about [Company]'s goals and challenges.

Key discussion points from our call:
• [Point 1]
• [Point 2]
• [Point 3]

Next Steps:
• [Action item 1]
• [Action item 2]

I'll follow up with [specific deliverable] by [date]. Please let me know if you have any questions in the meantime.

Looking forward to continuing our conversation!

Best regards,
[Your name]`;
  };

  const generateResolutionSummary = () => {
    return `Customer Support Resolution Summary

Call Date: ${recording ? new Date(recording.created_at).toLocaleDateString() : '[Date]'}
Customer: [Customer Name]
Case ID: [Case ID]

Issues Discussed:
• [Issue 1]
• [Issue 2]

Resolutions Provided:
• [Resolution 1]
• [Resolution 2]

Follow-up Actions:
• [Action 1]
• [Action 2]

Customer Satisfaction: [Rating]
Case Status: [Status]`;
  };

  const generateMeetingMinutes = () => {
    return `Meeting Minutes

Date: ${recording ? new Date(recording.created_at).toLocaleDateString() : '[Date]'}
Attendees: [Participant list]
Duration: ${recording?.duration ? `${Math.floor(recording.duration / 60)} minutes` : '[Duration]'}

Agenda Items Discussed:
1. [Item 1]
2. [Item 2]
3. [Item 3]

Key Decisions:
• [Decision 1]
• [Decision 2]

Action Items:
• [Action 1] - Owner: [Name] - Due: [Date]
• [Action 2] - Owner: [Name] - Due: [Date]

Next Meeting: [Date/Time]`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!recording) {
    return (
      <div className="text-center py-8">
        <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No recording selected</p>
        <p className="text-xs text-gray-400 mt-1">Attachments will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-eci-blue" />
          Attachments
          {attachments.length > 0 && (
            <span className="text-xs bg-eci-blue/10 text-eci-blue px-2 py-0.5 rounded-full">
              {attachments.length}
            </span>
          )}
        </h3>
        <button
          onClick={() => setIsUploading(true)}
          className="text-xs bg-eci-blue text-white px-3 py-1.5 rounded-md hover:bg-eci-blue/90 transition-colors flex items-center gap-1"
          disabled={isUploading}
        >
          <Plus className="w-3 h-3" />
          Add File
        </button>
      </div>

      {/* Attachments List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {attachments.length === 0 ? (
          <div className="text-center py-8">
            <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No attachments yet</p>
            <p className="text-xs text-gray-400 mt-1">Add files related to this recording</p>
          </div>
        ) : (
          attachments.map((attachment) => {
            const IconComponent = attachment.icon;
            return (
              <div
                key={attachment.id}
                className="bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-md ${
                    attachment.type === 'original' ? 'bg-eci-blue/10 text-eci-blue' :
                    attachment.type === 'generated' ? 'bg-green-50 text-green-600' :
                    attachment.type === 'document' ? 'bg-purple-50 text-purple-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900 text-sm truncate">{attachment.name}</h4>
                      <div className="flex items-center gap-2">
                        {attachment.size && (
                          <span className="text-xs text-gray-500">{attachment.size}</span>
                        )}
                        <button
                          onClick={() => handleDownload(attachment)}
                          className="text-eci-blue hover:text-eci-blue/80 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {attachment.description && (
                      <p className="text-xs text-gray-600 mb-2">{attachment.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(attachment.createdAt)}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        attachment.type === 'original' ? 'bg-eci-blue/10 text-eci-blue' :
                        attachment.type === 'generated' ? 'bg-green-50 text-green-600' :
                        attachment.type === 'document' ? 'bg-purple-50 text-purple-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {attachment.type === 'original' ? 'Original' :
                         attachment.type === 'generated' ? 'AI Generated' :
                         attachment.type === 'document' ? 'Document' : 'Link'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Area */}
      {isUploading && (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">Drag and drop files here, or click to browse</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setIsUploading(false)}
              className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Handle file upload logic here
                setIsUploading(false);
              }}
              className="text-xs bg-eci-blue text-white px-3 py-1.5 rounded-md hover:bg-eci-blue/90 transition-colors"
            >
              Upload Files
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        💡 <strong>Tip:</strong> Attachments are automatically generated based on your recording content. 
        You can also upload additional files like proposals, contracts, or reference materials.
      </div>
    </div>
  );
}