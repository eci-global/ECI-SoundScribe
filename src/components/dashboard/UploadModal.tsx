
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ModernFileUpload } from '@/components/ui/modern-file-upload';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Upload, FileAudio, Loader2, MessageSquare, Phone, Headphones, Users, GraduationCap, BookOpen } from 'lucide-react';

export type ContentType = 'sales_call' | 'customer_support' | 'team_meeting' | 'training_session' | 'bdr_training_data' | 'other';

export interface TrainingDataParams {
  callIdentifier: string;
  trainingProgramId?: string;
}

interface UploadProgress {
  stage: 'preparing' | 'extracting' | 'compressing' | 'uploading' | 'processing' | 'complete';
  progress: number;
  message: string;
  compressionInfo?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    processingTime: number;
  };
  extractionInfo?: {
    originalVideoSize: number;
    extractedAudioSize: number;
    compressionRatio: number;
    duration: number | null;
  };
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (
    file: File, 
    title: string, 
    description: string, 
    contentType?: ContentType, 
    enableCoaching?: boolean,
    trainingData?: TrainingDataParams
  ) => Promise<void>;
  uploadProgress?: UploadProgress | null;
  isUploading?: boolean;
}

type UploadStage = 'idle' | 'uploading' | 'transcribing' | 'summarizing' | 'completed' | 'error';

export default function UploadModal({ open, onClose, onUpload, uploadProgress, isUploading }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<ContentType>('other');
  const [enableCoaching, setEnableCoaching] = useState(true);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  // BDR Training Data specific fields
  const [callIdentifier, setCallIdentifier] = useState('');
  const [trainingProgramId, setTrainingProgramId] = useState('');
  const [isForTraining, setIsForTraining] = useState(false);
  
  const { toast } = useToast();

  // Use external upload progress if available, otherwise fall back to internal
  const currentProgress = uploadProgress || null;
  const currentlyUploading = isUploading || false;

  const contentTypeOptions = [
    { 
      value: 'sales_call' as ContentType, 
      label: 'Sales Call', 
      icon: Phone, 
      description: 'Customer/prospect conversations, demos, negotiations',
      coachingAreas: ['Talk-time ratio', 'Objection handling', 'Discovery questions', 'Value articulation']
    },
    { 
      value: 'customer_support' as ContentType, 
      label: 'Customer Support', 
      icon: Headphones, 
      description: 'Support tickets, troubleshooting, customer service',
      coachingAreas: ['Problem resolution', 'Empathy', 'Technical accuracy', 'Customer satisfaction']
    },
    { 
      value: 'team_meeting' as ContentType, 
      label: 'Team Meeting', 
      icon: Users, 
      description: 'Internal meetings, planning sessions, team discussions',
      coachingAreas: ['Participation', 'Decision-making', 'Communication clarity', 'Action items']
    },
    { 
      value: 'training_session' as ContentType, 
      label: 'Training Session', 
      icon: GraduationCap, 
      description: 'Training calls, coaching sessions, skill development',
      coachingAreas: ['Knowledge transfer', 'Engagement', 'Question handling', 'Clarity']
    },
    { 
      value: 'bdr_training_data' as ContentType, 
      label: 'BDR Training Data', 
      icon: BookOpen, 
      description: 'BDR calls for AI model training with manager scorecards',
      coachingAreas: ['Opening', 'Clear & Confident', 'Pattern Interrupt', 'Tone & Energy', 'Closing']
    },
    { 
      value: 'other' as ContentType, 
      label: 'Other', 
      icon: MessageSquare, 
      description: 'General recordings, interviews, or other content',
      coachingAreas: ['General analysis', 'Communication effectiveness']
    }
  ];

  const getStageProgress = (stage: UploadStage): number => {
    switch (stage) {
      case 'idle': return 0;
      case 'uploading': return 25;
      case 'transcribing': return 60;
      case 'summarizing': return 85;
      case 'completed': return 100;
      case 'error': return 0;
      default: return 0;
    }
  };

  const getStageMessage = (stage: UploadStage): string => {
    switch (stage) {
      case 'uploading': return 'Uploading file to storage...';
      case 'transcribing': return 'Transcribing audio with Whisper AI...';
      case 'summarizing': return 'Generating AI summary...';
      case 'completed': return 'Processing complete! Ready for chat.';
      case 'error': return 'An error occurred during processing.';
      default: return '';
    }
  };

  const getStageIcon = (stage: UploadStage) => {
    switch (stage) {
      case 'uploading': return <Upload className="h-4 w-4" />;
      case 'transcribing': return <FileAudio className="h-4 w-4" />;
      case 'summarizing': return <MessageSquare className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-eci-teal" />;
      default: return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const handleFileSelect = (files: File[]) => {
    const selectedFile = files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['audio/', 'video/'];
      const isValid = validTypes.some(type => selectedFile.type.startsWith(type));
      
      if (!isValid) {
        toast({
          title: "Invalid file type",
          description: "Please select an audio or video file",
          variant: "destructive"
        });
        return;
      }

      // Check file size (500MB limit)
      const maxSize = 500 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 500MB",
          variant: "destructive"
        });
        return;
      }

      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleFileRemove = () => {
    setFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || currentlyUploading) return;

    // Additional validation for BDR training data
    if (contentType === 'bdr_training_data' && !callIdentifier.trim()) {
      toast({ 
        title: "Missing Required Field", 
        description: "Call identifier is required for training data uploads.",
        variant: "destructive" 
      });
      return;
    }

    setUploadStage('uploading');

    try {
      // Prepare training data parameters if needed
      const trainingData: TrainingDataParams | undefined = contentType === 'bdr_training_data' 
        ? {
            callIdentifier: callIdentifier.trim(),
            trainingProgramId: trainingProgramId.trim() || undefined
          }
        : undefined;

      // Call the actual upload function - progress will be tracked externally
      await onUpload(file, title.trim(), description.trim(), contentType, enableCoaching, trainingData);

      // Mark as completed
      setUploadStage('completed');

      // Auto-close after success
      setTimeout(() => {
        setFile(null);
        setTitle('');
        setDescription('');
        setContentType('other');
        setEnableCoaching(true);
        setUploadStage('idle');
        setCallIdentifier('');
        setTrainingProgramId('');
        onClose();
      }, 2000);

      toast({
        title: "Upload successful!",
        description: "Your recording is ready for playback and AI chat."
      });

    } catch (error) {
      setUploadStage('error');
      
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file. Please try again.",
        variant: "destructive"
      });

      // Reset after error
      setTimeout(() => {
        setUploadStage('idle');
      }, 3000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white border border-eci-gray-200 shadow-xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-eci-gray-200 flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-semibold text-eci-gray-800 flex items-center gap-2">
            <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-eci-red" />
            Upload Recording
          </DialogTitle>
          <DialogDescription className="text-eci-gray-600 text-xs sm:text-sm">
            Transform your audio or video into intelligent insights with AI-powered analysis
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 sm:py-3">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pb-4">
            {/* Step 1: File Upload */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-eci-gray-100 text-eci-red rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-eci-gray-800">Select Your File</h3>
              </div>
              <ModernFileUpload
                onFileSelect={handleFileSelect}
                selectedFile={file}
                onFileRemove={handleFileRemove}
              />
            </div>

            {/* Step 2: Basic Information */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-eci-gray-100 text-eci-red rounded-full flex items-center justify-center text-xs font-medium">
                  2
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-eci-gray-800">Add Details</h3>
              </div>
              
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                <div>
                  <Label htmlFor="title" className="text-xs sm:text-sm font-medium text-eci-gray-700 mb-1 block">
                    Title <span className="text-eci-red">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Sales call with Acme Corp"
                    className="h-8 sm:h-9 border-eci-gray-200 focus:border-eci-red focus:ring-eci-red/20 transition-all duration-200 text-sm"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-xs sm:text-sm font-medium text-eci-gray-700 mb-1 block">
                    Description <span className="text-eci-gray-400">(optional)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add context, participants, or key topics discussed..."
                    rows={2}
                    className="border-eci-gray-200 focus:border-eci-red focus:ring-eci-red/20 transition-all duration-200 resize-none text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Content Type Selection */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-eci-gray-100 text-eci-red rounded-full flex items-center justify-center text-xs font-medium">
                  3
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-eci-gray-800">Choose Content Type</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {contentTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = contentType === option.value;
                  return (
                    <div
                      key={option.value}
                      className={`relative border-2 rounded-lg p-2 sm:p-3 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-eci-red bg-eci-red/5 shadow-sm'
                          : 'border-eci-gray-200 hover:border-eci-gray-300 hover:bg-eci-gray-50'
                      }`}
                      onClick={() => setContentType(option.value)}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-eci-red text-white' : 'bg-eci-gray-100 text-eci-gray-500'
                        }`}>
                          <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <h4 className={`text-xs sm:text-sm font-semibold ${
                              isSelected ? 'text-eci-gray-800' : 'text-eci-gray-800'
                            }`}>
                              {option.label}
                            </h4>
                            {isSelected && (
                              <CheckCircle className="w-3 h-3 text-eci-red flex-shrink-0" />
                            )}
                          </div>
                          {enableCoaching && option.value !== 'other' && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {option.coachingAreas.slice(0, 1).map((area) => (
                                <span 
                                  key={area} 
                                  className={`text-xs px-1 py-0.5 rounded-full ${
                                    isSelected 
                                      ? 'bg-eci-red/10 text-eci-red' 
                                      : 'bg-eci-gray-100 text-eci-gray-600'
                                  }`}
                                >
                                  {area}
                                </span>
                              ))}
                              {option.coachingAreas.length > 1 && (
                                <span className="text-xs text-eci-gray-500">
                                  +{option.coachingAreas.length - 1}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 4: BDR Training Data Fields (conditional) */}
            {contentType === 'bdr_training_data' && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 bg-eci-gray-100 text-eci-red rounded-full flex items-center justify-center text-xs font-medium">
                    4
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-eci-gray-800">Training Data Information</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  <div>
                    <Label htmlFor="callIdentifier" className="text-xs sm:text-sm font-medium text-eci-gray-700 mb-1 block">
                      Call Identifier <span className="text-eci-red">*</span>
                    </Label>
                    <Input
                      id="callIdentifier"
                      value={callIdentifier}
                      onChange={(e) => setCallIdentifier(e.target.value)}
                      placeholder="e.g., CALL_001, BDR_2024_015"
                      className="h-8 sm:h-9 border-eci-gray-200 focus:border-eci-red focus:ring-eci-red/20 transition-all duration-200 text-sm"
                      required
                    />
                    <p className="text-xs text-eci-gray-500 mt-1">
                      Must match identifier in Excel scorecard data
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="trainingProgram" className="text-xs sm:text-sm font-medium text-eci-gray-700 mb-1 block">
                      Training Program
                    </Label>
                    <Input
                      id="trainingProgram"
                      value={trainingProgramId}
                      onChange={(e) => setTrainingProgramId(e.target.value)}
                      placeholder="e.g., Q1-2024-BDR-Training"
                      className="h-8 sm:h-9 border-eci-gray-200 focus:border-eci-red focus:ring-eci-red/20 transition-all duration-200 text-sm"
                    />
                    <p className="text-xs text-eci-gray-500 mt-1">
                      Optional: Associate with specific training program
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: AI Coaching Toggle */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-eci-gray-100 text-eci-red rounded-full flex items-center justify-center text-xs font-medium">
                  5
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-eci-gray-800">AI Coaching Analysis</h3>
              </div>
              
              <div className={`border-2 rounded-lg p-2 sm:p-3 transition-all duration-200 ${
                enableCoaching ? 'border-eci-red/20 bg-eci-red/5' : 'border-eci-gray-200 bg-eci-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-lg flex items-center justify-center ${
                        enableCoaching ? 'bg-eci-red text-white' : 'bg-eci-gray-400 text-white'
                      }`}>
                        {enableCoaching ? <CheckCircle className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-eci-gray-800">
                        {enableCoaching ? 'Coaching Enabled' : 'Basic Analysis Only'}
                      </h4>
                    </div>
                    {enableCoaching && contentType !== 'other' && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {contentTypeOptions.find(opt => opt.value === contentType)?.coachingAreas.slice(0, 2).map((area) => (
                          <span key={area} className="text-xs bg-eci-red/10 text-eci-red px-1 py-0.5 rounded-full">
                            {area}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-2">
                    <input
                      type="checkbox"
                      checked={enableCoaching}
                      onChange={(e) => setEnableCoaching(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 sm:w-10 sm:h-5 bg-eci-gray-200 peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-eci-red/30 rounded-full peer peer-checked:after:translate-x-4 sm:peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-eci-gray-300 after:border after:rounded-full after:h-3 after:w-3 sm:after:h-4 sm:after:w-4 after:transition-all peer-checked:bg-eci-red"></div>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Progress Section - Enhanced with video extraction progress */}
            {(currentlyUploading || uploadStage !== 'idle') && (
              <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 bg-eci-gray-50 rounded-lg border border-eci-gray-200">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {currentProgress ? (
                      currentProgress.stage === 'extracting' ? <FileAudio className="h-4 w-4 text-eci-red animate-pulse" /> :
                      currentProgress.stage === 'compressing' ? <Loader2 className="h-4 w-4 text-eci-red animate-spin" /> :
                      currentProgress.stage === 'uploading' ? <Upload className="h-4 w-4 text-eci-red" /> :
                      currentProgress.stage === 'processing' ? <MessageSquare className="h-4 w-4 text-eci-red" /> :
                      currentProgress.stage === 'complete' ? <CheckCircle className="h-4 w-4 text-eci-teal" /> :
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      getStageIcon(uploadStage)
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-eci-gray-800">
                        {currentProgress ? currentProgress.message : getStageMessage(uploadStage)}
                      </span>
                      <span className="text-sm text-eci-gray-600">
                        {currentProgress ? Math.round(currentProgress.progress) : Math.round(progress)}%
                      </span>
                    </div>
                    <Progress 
                      value={currentProgress ? currentProgress.progress : progress} 
                      className="h-3 bg-eci-gray-200 [&>div]:bg-eci-red" 
                    />
                    
                    {/* Enhanced progress details for video extraction */}
                    {currentProgress?.extractionInfo && (
                      <div className="mt-2 text-xs text-eci-gray-600">
                        <div className="flex justify-between">
                          <span>🎬 Original: {(currentProgress.extractionInfo.originalVideoSize / 1024 / 1024).toFixed(1)}MB</span>
                          <span>🎵 Extracted: {(currentProgress.extractionInfo.extractedAudioSize / 1024 / 1024).toFixed(1)}MB</span>
                          <span>📉 {currentProgress.extractionInfo.compressionRatio.toFixed(0)}x smaller</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Compression details */}
                    {currentProgress?.compressionInfo && (
                      <div className="mt-2 text-xs text-eci-gray-600">
                        <div className="flex justify-between">
                          <span>🗜️ Compressed: {currentProgress.compressionInfo.compressionRatio.toFixed(1)}x smaller</span>
                          <span>⏱️ {(currentProgress.compressionInfo.processingTime / 1000).toFixed(1)}s</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Enhanced Stage Indicators with Video Extraction */}
                <div className="flex items-center justify-between">
                  {currentProgress ? [
                    { stage: 'extracting', icon: FileAudio, label: 'Extract' },
                    { stage: 'compressing', icon: Loader2, label: 'Compress' },
                    { stage: 'uploading', icon: Upload, label: 'Upload' },
                    { stage: 'processing', icon: MessageSquare, label: 'Process' },
                    { stage: 'complete', icon: CheckCircle, label: 'Complete' }
                  ].map(({ stage, icon: Icon, label }) => {
                    const isActive = currentProgress.stage === stage;
                    const isPast = ['extracting', 'compressing', 'uploading', 'processing', 'complete'].indexOf(currentProgress.stage) > 
                                   ['extracting', 'compressing', 'uploading', 'processing', 'complete'].indexOf(stage);
                    return (
                      <div 
                        key={stage}
                        className={`flex flex-col items-center gap-1 ${
                          isActive || isPast ? 'text-eci-red' : 'text-eci-gray-400'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive && stage === 'compressing' ? 'animate-spin' : ''}`} />
                        <span className="text-xs font-medium">{label}</span>
                      </div>
                    );
                  }) : [
                    { stage: 'uploading', icon: Upload, label: 'Upload' },
                    { stage: 'transcribing', icon: FileAudio, label: 'Transcribe' },
                    { stage: 'summarizing', icon: MessageSquare, label: 'Analyze' },
                    { stage: 'completed', icon: CheckCircle, label: 'Complete' }
                  ].map(({ stage, icon: Icon, label }) => (
                    <div 
                      key={stage}
                      className={`flex flex-col items-center gap-1 ${
                        (stage === 'uploading' && ['uploading', 'transcribing', 'summarizing', 'completed'].includes(uploadStage)) ||
                        (stage === 'transcribing' && ['transcribing', 'summarizing', 'completed'].includes(uploadStage)) ||
                        (stage === 'summarizing' && ['summarizing', 'completed'].includes(uploadStage)) ||
                        (stage === 'completed' && uploadStage === 'completed')
                          ? 'text-eci-red' : 'text-eci-gray-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </form>
        </div>
        
        {/* Action Buttons - Sticky at bottom */}
        <div className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 border-t border-eci-gray-100 bg-white">
          <div className="flex gap-2 sm:gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={uploadStage !== 'idle' && uploadStage !== 'completed' && uploadStage !== 'error'}
              className="flex-1 h-8 sm:h-9 border-eci-gray-300 hover:bg-eci-gray-50 transition-all duration-200 text-xs sm:text-sm"
            >
              {uploadStage === 'completed' ? 'Close' : 'Cancel'}
            </Button>
            <Button 
              type="submit" 
              disabled={!file || !title.trim() || (uploadStage !== 'idle' && uploadStage !== 'error')}
              className="flex-1 h-8 sm:h-9 bg-eci-red hover:bg-eci-red-dark text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              onClick={handleSubmit}
            >
              {uploadStage === 'idle' || uploadStage === 'error' ? (
                <>
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Start Upload
                </>
              ) : uploadStage === 'completed' ? (
                <>
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Done
                </>
              ) : (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  Processing...
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
