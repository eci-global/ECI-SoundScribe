# Real Speaker Diarization Setup Guide

## Overview

This implementation provides **real voice-based speaker diarization** to replace the previous text-only analysis. It integrates with external services that offer Whisper-quality transcription combined with actual speaker voice pattern recognition.

## Supported Services

### 1. AssemblyAI (Recommended)
- **Quality**: Excellent speaker diarization with Whisper-level transcription
- **Features**: Automatic speaker detection, high accuracy, good pricing
- **Setup**: Get API key from [AssemblyAI](https://www.assemblyai.com/)
- **Environment Variable**: `ASSEMBLYAI_API_KEY`

### 2. Deepgram
- **Quality**: Nova-2 model with excellent diarization
- **Features**: Real-time processing, multiple language support
- **Setup**: Get API key from [Deepgram](https://deepgram.com/)
- **Environment Variable**: `DEEPGRAM_API_KEY`

### 3. Rev.ai
- **Quality**: Professional-grade transcription with speaker identification
- **Features**: Human-level accuracy, good for professional recordings
- **Setup**: Get API key from [Rev.ai](https://www.rev.ai/)
- **Environment Variable**: `REVAI_API_KEY`

## Implementation Details

### How It Works

1. **User clicks "Real Voice Analysis"** button in OutlinePanel
2. **Audio file is sent** to external diarization service
3. **Service processes** audio using real voice pattern recognition
4. **Results are stored** in database with `analysis_method: 'real_voice_diarization'`
5. **UI updates** to show accurate speaker count and analysis method

### Features Implemented

- ✅ **Real Voice Analysis Button** - Trigger diarization on-demand
- ✅ **Service Fallback** - Tries multiple services if one fails
- ✅ **Progress Indicators** - Shows loading state during processing
- ✅ **Error Handling** - Graceful failure with user feedback
- ✅ **Status Indicators** - Visual indicators for analysis method
- ✅ **Priority System** - Real voice analysis takes highest priority

### Database Schema

The speaker analysis is stored in the `recordings.ai_speaker_analysis` field:

```json
{
  "identified_speakers": [
    {
      "name": "Speaker 1",
      "confidence": 0.92,
      "segments": [...],
      "characteristics": {
        "speaking_time": 120.5,
        "segment_count": 15,
        "voice_analysis": true,
        "service_used": "assemblyai"
      }
    }
  ],
  "confidence_score": 0.89,
  "analysis_method": "real_voice_diarization",
  "total_speakers": 2,
  "processing_date": "2024-12-27T...",
  "service_provider": "assemblyai"
}
```

## Setup Instructions

### 1. Environment Variables

Add one or more of these to your Supabase Edge Functions environment:

```bash
# AssemblyAI (Recommended)
ASSEMBLYAI_API_KEY=your_assemblyai_api_key

# Deepgram (Alternative)
DEEPGRAM_API_KEY=your_deepgram_api_key

# Rev.ai (Professional)
REVAI_API_KEY=your_revai_api_key
```

### 2. Deploy Edge Function

Deploy the new diarization service:

```bash
npx supabase functions deploy whisper-diarization-service
```

### 3. Test the Integration

1. Upload a recording with multiple speakers
2. Wait for processing to complete
3. Click "Real Voice Analysis" button in OutlinePanel
4. Verify speaker count and analysis method indicators

## Service Comparison

| Service | Accuracy | Speed | Cost | Best For |
|---------|----------|--------|------|----------|
| AssemblyAI | ⭐⭐⭐⭐⭐ | Fast | $$ | General use, best balance |
| Deepgram | ⭐⭐⭐⭐⭐ | Very Fast | $$$ | Real-time processing |
| Rev.ai | ⭐⭐⭐⭐⭐ | Slow | $$$$ | Professional/legal recordings |

## Benefits Over Previous System

### Before (Text-Only Analysis)
- ❌ Fake confidence scores
- ❌ No actual voice pattern recognition  
- ❌ Misleading "voice analysis" claims
- ❌ Inaccurate speaker counting
- ❌ Generic "Speaker 1, Speaker 2" labels

### After (Real Voice Diarization)
- ✅ **Real voice pattern analysis**
- ✅ **Accurate speaker counting**
- ✅ **Honest confidence scores**
- ✅ **Clear analysis method indicators**
- ✅ **Professional service backing**
- ✅ **Whisper-quality transcription + diarization**

## Cost Considerations

### Typical Pricing (as of 2024)
- **AssemblyAI**: ~$0.37/hour with diarization
- **Deepgram**: ~$0.43/hour with diarization  
- **Rev.ai**: ~$1.25/hour with diarization

### Optimization Tips
1. **Only run on important recordings** - Use the UI button selectively
2. **Batch processing** - Process multiple recordings together if supported
3. **File size limits** - Keep recordings under 100MB for best performance
4. **Fallback strategy** - Configure multiple services for reliability

## Troubleshooting

### Common Issues

1. **"Real Voice Analysis" button not showing**
   - Check if recording is completed (`status: 'completed'`)
   - Verify recording has `file_url`
   - Ensure file size is under 100MB

2. **"Diarization Failed" error**
   - Check API key configuration
   - Verify audio file accessibility
   - Check service status/quotas

3. **No improvement in speaker count**
   - Some recordings may genuinely have the same speaker count
   - Check confidence scores and analysis method indicators
   - Review the actual speaker segments in database

### Debugging

Enable detailed logging in browser console:
- Look for `🎤 Starting real speaker diarization` messages
- Check service selection and fallback logic
- Monitor API responses and error details

## Integration with Existing System

This implementation:
- **Maintains compatibility** with existing text-based analysis
- **Prioritizes real voice data** when available
- **Falls back gracefully** to existing methods
- **Updates UI indicators** to show analysis method
- **Preserves all existing functionality**

## Future Enhancements

Potential improvements:
1. **Automatic triggering** for high-value recordings
2. **Speaker name recognition** using voice embeddings
3. **Custom model training** for organization-specific voices
4. **Batch processing UI** for multiple recordings
5. **Cost optimization** through service selection logic

---

## Summary

This implementation provides **real voice-based speaker diarization** that addresses the user's concerns about inaccurate speaker detection. It:

1. **Uses actual voice pattern recognition** instead of text analysis
2. **Provides honest analysis indicators** showing the method used
3. **Maintains fallback compatibility** with existing systems
4. **Offers multiple service options** for reliability and cost optimization
5. **Implements clear UI indicators** for transparency

The user can now get accurate speaker counts based on real voice analysis while maintaining the existing functionality for fallback scenarios.