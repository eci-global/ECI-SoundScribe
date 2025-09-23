/**
 * Quick Duration Repair - Console utility for immediate testing
 * 
 * This can be imported and run from browser console to test the repair utility
 */

import { supabase } from '@/integrations/supabase/client';
import { repairRecordingDuration } from './durationRepair';

/**
 * Quick repair function for console testing
 */
export async function quickRepairRecording(recordingId: string) {
  console.log(`🔧 Quick repair for recording: ${recordingId}`);
  
  try {
    // First, check current state
    const { data: before, error } = await supabase
      .from('recordings')
      .select('id, title, duration, file_size, created_at')
      .eq('id', recordingId)
      .single();

    if (error || !before) {
      console.error(`❌ Recording not found: ${error?.message || 'Not found'}`);
      return;
    }

    console.log(`📊 BEFORE repair:`, {
      id: before.id,
      title: before.title,
      duration: before.duration,
      fileSize: before.file_size ? `${(before.file_size / 1024 / 1024).toFixed(2)}MB` : 'unknown'
    });

    // Run repair
    const repairResult = await repairRecordingDuration(recordingId);
    
    console.log(`🔧 REPAIR RESULT:`, repairResult);

    // Check after state
    const { data: after } = await supabase
      .from('recordings')
      .select('id, title, duration, file_size, processing_notes')
      .eq('id', recordingId)
      .single();

    if (after) {
      console.log(`📊 AFTER repair:`, {
        id: after.id,
        title: after.title,
        duration: after.duration,
        fileSize: after.file_size ? `${(after.file_size / 1024 / 1024).toFixed(2)}MB` : 'unknown',
        processingNotes: after.processing_notes
      });
    }

    return repairResult;
  } catch (error) {
    console.error(`❌ Quick repair failed:`, error);
    throw error;
  }
}

/**
 * Console helper - can be copy/pasted into browser console
 */
export const consoleRepairHelper = `
// Copy and paste this into browser console to repair the recording:

import('http://localhost:5173/src/utils/quickRepair.ts').then(module => {
  window.quickRepair = module.quickRepairRecording;
  console.log('✅ Quick repair loaded! Use: quickRepair("eadecee7-8825-4a57-86e3-baf32a6895bb")');
});
`;

// Global export for console access
if (typeof window !== 'undefined') {
  (window as any).quickRepairRecording = quickRepairRecording;
}