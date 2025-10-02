#!/usr/bin/env node

// Script to check processing status of large video uploads
// Usage: node check-processing-status.js [recording_id]

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qinkldgvejheppheykfl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbmtsZGd2ZWpoZXBwaGV5a2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1OTA0NDcsImV4cCI6MjA2NTE2NjQ0N30.xn9c-6Sr_kEbETzafRrlaWMHgbUIoqifsCQBrqYT7u4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkProcessingStatus(recordingId = null) {
    try {
        console.log('🔍 Checking recording processing status...\n');
        
        // If no specific recording ID, get recent large files
        let query = supabase
            .from('recordings')
            .select('id, title, file_size, status, created_at, updated_at, transcript, ai_summary, ai_moments, error_message, processing_notes')
            .order('created_at', { ascending: false });
        
        if (recordingId) {
            query = query.eq('id', recordingId);
        } else {
            query = query.limit(10);
        }
        
        const { data: recordings, error } = await query;
        
        if (error) {
            console.error('❌ Error fetching recordings:', error.message);
            return;
        }
        
        if (!recordings || recordings.length === 0) {
            console.log('📭 No recordings found');
            return;
        }
        
        console.log(`📊 Found ${recordings.length} recording${recordings.length > 1 ? 's' : ''}:\n`);
        
        recordings.forEach((recording, index) => {
            const fileSizeMB = recording.file_size ? (recording.file_size / (1024 * 1024)).toFixed(2) : 'Unknown';
            const createdAgo = getTimeAgo(new Date(recording.created_at));
            const updatedAgo = getTimeAgo(new Date(recording.updated_at));
            
            console.log(`${index + 1}. 📁 ${recording.title}`);
            console.log(`   ID: ${recording.id}`);
            console.log(`   📏 Size: ${fileSizeMB}MB`);
            console.log(`   📊 Status: ${getStatusIcon(recording.status)} ${recording.status}`);
            console.log(`   🕐 Created: ${createdAgo}`);
            console.log(`   ⏰ Updated: ${updatedAgo}`);
            
            // Processing details
            if (recording.transcript) {
                console.log(`   📝 Transcript: ✅ ${recording.transcript.length} characters`);
            } else {
                console.log(`   📝 Transcript: ❌ Not available`);
            }
            
            if (recording.ai_summary) {
                console.log(`   🤖 AI Summary: ✅ ${recording.ai_summary.length} characters`);
            } else {
                console.log(`   🤖 AI Summary: ❌ Not available`);
            }
            
            if (recording.ai_moments && recording.ai_moments.length > 0) {
                console.log(`   ✨ AI Moments: ✅ ${recording.ai_moments.length} moments`);
            } else {
                console.log(`   ✨ AI Moments: ❌ Not available`);
            }
            
            if (recording.error_message) {
                console.log(`   ⚠️  Error: ${recording.error_message}`);
            }
            
            if (recording.processing_notes) {
                console.log(`   📋 Notes: ${recording.processing_notes}`);
            }
            
            // Processing time estimate
            const processingTime = getProcessingTimeEstimate(recording.status, fileSizeMB, createdAgo);
            if (processingTime) {
                console.log(`   ⏱️  ${processingTime}`);
            }
            
            console.log(''); // Empty line
        });
        
        // Show overall status summary
        const statusCounts = recordings.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
        }, {});
        
        console.log('📈 Status Summary:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   ${getStatusIcon(status)} ${status}: ${count}`);
        });
        
        // Show next steps for pending recordings
        const pendingRecordings = recordings.filter(r => 
            ['pending', 'processing', 'transcribing', 'uploading', 'processing_large_file'].includes(r.status)
        );
        
        if (pendingRecordings.length > 0) {
            console.log('\n🔄 Pending Processing:');
            pendingRecordings.forEach(recording => {
                const fileSizeMB = recording.file_size ? (recording.file_size / (1024 * 1024)).toFixed(2) : 'Unknown';
                const expectedTime = getExpectedProcessingTime(fileSizeMB);
                console.log(`   • ${recording.title} (${fileSizeMB}MB) - Expected: ${expectedTime}`);
            });
            
            console.log('\n💡 Tips:');
            console.log('   • Large files (>50MB) may take 10-20 minutes');
            console.log('   • Processing happens in background');
            console.log('   • Refresh the dashboard to see updates');
            console.log('   • Check Azure OpenAI quotas if stuck');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

function getStatusIcon(status) {
    const icons = {
        'pending': '⏳',
        'uploading': '⬆️',
        'processing': '🔄',
        'transcribing': '🎤',
        'processing_large_file': '📦',
        'completed': '✅',
        'failed': '❌',
        'transcription_failed': '🚫',
        'processing_failed': '💥'
    };
    return icons[status] || '❓';
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function getProcessingTimeEstimate(status, fileSizeMB, createdAgo) {
    const size = parseFloat(fileSizeMB);
    
    if (['completed', 'failed', 'transcription_failed'].includes(status)) {
        return null;
    }
    
    if (status === 'pending' || status === 'uploading') {
        return 'Estimated start: Within 1-2 minutes';
    }
    
    if (status === 'processing' || status === 'transcribing' || status === 'processing_large_file') {
        let expectedMins;
        if (size < 10) expectedMins = '2-5';
        else if (size < 50) expectedMins = '5-10';
        else if (size < 100) expectedMins = '10-20';
        else expectedMins = '15-30';
        
        return `Estimated completion: ${expectedMins} minutes`;
    }
    
    return null;
}

function getExpectedProcessingTime(fileSizeMB) {
    const size = parseFloat(fileSizeMB);
    if (size < 10) return '2-5 minutes';
    if (size < 50) return '5-10 minutes';
    if (size < 100) return '10-20 minutes';
    return '15-30 minutes';
}

// Main execution
const recordingId = process.argv[2];

if (recordingId && !recordingId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    console.error('❌ Invalid recording ID format. Expected UUID format.');
    process.exit(1);
}

checkProcessingStatus(recordingId);