
import jsPDF from 'jspdf';
import type { Recording } from '@/types/recording';

interface ExportOptions {
  includeTranscript: boolean;
  includeMetadata?: boolean;
  includeSummary?: boolean;
}

export const exportRecordingToPDF = (recording: Recording, options: ExportOptions = { includeTranscript: false }) => {
  const doc = new jsPDF();
  let yPosition = 20;
  
  // Title
  doc.setFontSize(20);
  doc.text(recording.title || 'Recording', 20, yPosition);
  yPosition += 15;
  
  // Basic info
  doc.setFontSize(12);
  doc.text(`Created: ${new Date(recording.created_at).toLocaleDateString()}`, 20, yPosition);
  yPosition += 10;
  
  if (recording.duration) {
    doc.text(`Duration: ${Math.round(recording.duration)} seconds`, 20, yPosition);
    yPosition += 10;
  }
  
  yPosition += 5;
  
  // Summary
  if (options.includeSummary && recording.summary) {
    doc.setFontSize(14);
    doc.text('Summary:', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(recording.summary, 170);
    doc.text(summaryLines, 20, yPosition);
    yPosition += summaryLines.length * 5 + 10;
  }
  
  // Metadata
  if (options.includeMetadata) {
    doc.setFontSize(14);
    doc.text('Metadata:', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    if (recording.file_type) {
      doc.text(`File Type: ${recording.file_type}`, 20, yPosition);
      yPosition += 7;
    }
    
    if (recording.file_size) {
      const sizeInMB = (recording.file_size / (1024 * 1024)).toFixed(2);
      doc.text(`File Size: ${sizeInMB} MB`, 20, yPosition);
      yPosition += 7;
    }
    
    if (recording.status) {
      doc.text(`Status: ${recording.status}`, 20, yPosition);
      yPosition += 7;
    }
    
    yPosition += 10;
  }
  
  // Transcript
  if (options.includeTranscript && recording.transcript) {
    doc.setFontSize(14);
    doc.text('Transcript:', 20, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    const transcriptLines = doc.splitTextToSize(recording.transcript, 170);
    
    // Handle page breaks for long transcripts
    for (let i = 0; i < transcriptLines.length; i++) {
      if (yPosition > 270) { // Near bottom of page
        doc.addPage();
        yPosition = 20;
      }
      doc.text(transcriptLines[i], 20, yPosition);
      yPosition += 5;
    }
  }
  
  // Save the PDF
  const fileName = `${recording.title?.replace(/[^a-z0-9]/gi, '_') || 'recording'}.pdf`;
  doc.save(fileName);
};

export const exportMultipleRecordingsToPDF = (recordings: Recording[], options: ExportOptions = { includeTranscript: false }) => {
  const doc = new jsPDF();
  let yPosition = 20;
  
  // Title page
  doc.setFontSize(20);
  doc.text('Recording Export', 20, yPosition);
  yPosition += 15;
  
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
  yPosition += 10;
  doc.text(`Total Recordings: ${recordings.length}`, 20, yPosition);
  
  recordings.forEach((recording, index) => {
    // Add new page for each recording (except the first)
    if (index > 0) {
      doc.addPage();
    } else {
      yPosition = 60; // Start below title on first page
    }
    yPosition = 20;
    
    // Recording header
    doc.setFontSize(16);
    doc.text(`${index + 1}. ${recording.title || 'Untitled Recording'}`, 20, yPosition);
    yPosition += 12;
    
    // Basic info
    doc.setFontSize(10);
    doc.text(`Created: ${new Date(recording.created_at).toLocaleDateString()}`, 20, yPosition);
    yPosition += 7;
    
    if (recording.duration) {
      doc.text(`Duration: ${Math.round(recording.duration)} seconds`, 20, yPosition);
      yPosition += 7;
    }
    
    yPosition += 5;
    
    // Summary
    if (options.includeSummary && recording.summary) {
      doc.setFontSize(12);
      doc.text('Summary:', 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(9);
      const summaryLines = doc.splitTextToSize(recording.summary, 170);
      doc.text(summaryLines, 20, yPosition);
      yPosition += summaryLines.length * 4 + 8;
    }
    
    // Metadata
    if (options.includeMetadata) {
      doc.setFontSize(12);
      doc.text('Metadata:', 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(9);
      if (recording.file_type) {
        doc.text(`File Type: ${recording.file_type}`, 20, yPosition);
        yPosition += 5;
      }
      
      if (recording.file_size) {
        const sizeInMB = (recording.file_size / (1024 * 1024)).toFixed(2);
        doc.text(`File Size: ${sizeInMB} MB`, 20, yPosition);
        yPosition += 5;
      }
      
      if (recording.status) {
        doc.text(`Status: ${recording.status}`, 20, yPosition);
        yPosition += 5;
      }
      
      yPosition += 8;
    }
    
    // Transcript
    if (options.includeTranscript && recording.transcript) {
      doc.setFontSize(12);
      doc.text('Transcript:', 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(9);
      const transcriptLines = doc.splitTextToSize(recording.transcript, 170);
      
      // Handle page breaks for long transcripts
      for (let i = 0; i < transcriptLines.length; i++) {
        if (yPosition > 270) { // Near bottom of page
          doc.addPage();
          yPosition = 20;
        }
        doc.text(transcriptLines[i], 20, yPosition);
        yPosition += 4;
      }
    }
  });
  
  // Save the PDF
  const fileName = `recordings_export_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
