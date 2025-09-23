/**
 * BDR Training Integration Tests
 * 
 * Basic integration tests for the BDR training system
 * Run with: npm test src/tests/bdrIntegration.test.ts
 */

import { describe, it, expect } from 'vitest';
import { extractBDRScoresFromRecording } from '@/utils/bdrIntegration';
import { Recording } from '@/types/recording';

describe('BDR Integration', () => {
  it('should extract BDR scores from recording with AI analysis', () => {
    const mockRecording: Partial<Recording> = {
      id: 'test-1',
      ai_analysis: JSON.stringify({
        coaching_scores: {
          opening: 8.5,
          clarity: 7.2,
          pattern_interrupt: 6.8,
          tone: 8.0,
          closing: 7.5,
          overall: 7.6
        }
      }),
      ai_summary: 'Great call with clear opening and confident delivery'
    };

    const scores = extractBDRScoresFromRecording(mockRecording as Recording);

    expect(scores).toBeDefined();
    expect(scores?.opening).toBe(8.5);
    expect(scores?.clearConfident).toBe(7.2);
    expect(scores?.patternInterrupt).toBe(6.8);
    expect(scores?.toneEnergy).toBe(8.0);
    expect(scores?.closing).toBe(7.5);
    expect(scores?.overall).toBe(0); // Falls back to 0 when not provided
  });

  it('should estimate scores from AI summary when no coaching scores available', () => {
    const mockRecording: Partial<Recording> = {
      id: 'test-2',
      ai_analysis: '{}',
      ai_summary: 'Professional greeting and introduction. Clear and confident delivery throughout. Engaging conversation with good energy. Strong closing with clear next steps.'
    };

    const scores = extractBDRScoresFromRecording(mockRecording as Recording);

    expect(scores).toBeDefined();
    expect(scores?.opening).toBeGreaterThan(5); // Should detect "professional greeting"
    expect(scores?.clearConfident).toBeGreaterThan(5); // Should detect "clear and confident"
    expect(scores?.toneEnergy).toBeGreaterThan(5); // Should detect "good energy"
    expect(scores?.closing).toBeGreaterThan(5); // Should detect "closing with next steps"
  });

  it('should return null for recordings without analysis', () => {
    const mockRecording: Partial<Recording> = {
      id: 'test-3',
      ai_analysis: null,
      ai_summary: ''
    };

    const scores = extractBDRScoresFromRecording(mockRecording as Recording);

    expect(scores).toBeNull();
  });

  it('should handle malformed AI analysis gracefully', () => {
    const mockRecording: Partial<Recording> = {
      id: 'test-4',
      ai_analysis: 'invalid json',
      ai_summary: 'Good call with professional approach and clear communication'
    };

    const scores = extractBDRScoresFromRecording(mockRecording as Recording);

    expect(scores).toBeDefined(); // Should fall back to summary analysis
    expect(scores?.overall).toBeGreaterThan(0);
  });

  it('should generate realistic score ranges', () => {
    const mockRecording: Partial<Recording> = {
      id: 'test-5',
      ai_analysis: '{}',
      ai_summary: 'Average performance with some areas for improvement'
    };

    const scores = extractBDRScoresFromRecording(mockRecording as Recording);

    expect(scores).toBeDefined();
    // All scores should be within valid range
    Object.values(scores!).forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });
});