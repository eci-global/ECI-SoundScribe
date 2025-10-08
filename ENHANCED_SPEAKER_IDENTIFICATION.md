# Enhanced Speaker Identification System

## Overview

The Enhanced Speaker Identification System automatically extracts speaker names from recording titles, allows users to confirm and correct speaker information, and learns from user feedback to improve future speaker identification accuracy.

## Features

### 🎯 **Automatic Name Extraction**
- Extracts potential speaker names from recording titles using intelligent pattern matching
- Supports various title formats:
  - "Call with John Smith and Jane Doe"
  - "John Smith - Sales Call"
  - "Interview: Sarah Johnson"
  - "UX Interview with Mike Chen"
  - "Support call - Alex Rodriguez"
  - "Meeting between Tom Wilson, Lisa Brown - Product Review"

### 👥 **Speaker Confirmation Dialog**
- Automatically appears when a recording loads and contains potential speaker names
- Allows users to:
  - Confirm or correct extracted names
  - Add additional speakers manually
  - Mark speakers as employees
  - Associate speakers with existing employee records

### 🎤 **Voice Characteristics Learning**
- Analyzes speaker voice patterns from recordings
- Stores voice characteristics for future identification:
  - Pitch range
  - Speaking rate
  - Volume patterns
  - Pause frequency
  - Speech patterns and fillers

### 🔄 **Employee Integration**
- Matches identified speakers with existing employee records
- Creates voice profiles for employees
- Improves speaker identification accuracy over time
- Enables automatic speaker tagging in future recordings

## Technical Implementation

### Database Schema

#### `speaker_confirmations` Table
```sql
CREATE TABLE public.speaker_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES public.recordings(id) ON DELETE CASCADE NOT NULL,
  confirmed_speakers JSONB NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `employee_voice_profiles` Table
```sql
CREATE TABLE public.employee_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  voice_characteristics JSONB,
  is_active BOOLEAN DEFAULT true,
  recordings_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

#### `speaker_identification_results` Table
```sql
CREATE TABLE public.speaker_identification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES public.recordings(id) ON DELETE CASCADE NOT NULL,
  identified_speakers JSONB NOT NULL,
  identification_method TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  processing_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Core Services

#### `SpeakerIdentificationService`
- `extractNamesFromTitle()` - Extracts names from recording titles
- `getMatchingEmployees()` - Finds matching employee records
- `createSpeakerConfirmationData()` - Creates confirmation dialog data
- `saveConfirmedSpeakers()` - Saves user-confirmed speaker data
- `extractVoiceCharacteristics()` - Analyzes voice patterns

#### `useSpeakerConfirmation` Hook
- Manages speaker confirmation dialog state
- Handles speaker data loading and saving
- Determines when to show confirmation dialog

### Components

#### `SpeakerConfirmationDialog`
- Modal dialog for speaker confirmation
- Employee selection and association
- Voice characteristics display
- Batch speaker management

#### Integration Points
- `ConversationView` - Shows dialog when recording loads
- `EmployeeManagement` - Links to employee creation
- `SpeakerTimeline` - Uses confirmed speaker data

## Usage Workflow

### 1. **Recording Upload**
- User uploads recording with descriptive title
- System extracts potential speaker names from title

### 2. **Automatic Detection**
- When recording loads, system checks for extracted names
- If names found, speaker confirmation dialog appears

### 3. **User Confirmation**
- User reviews extracted names
- Can correct, add, or remove speakers
- Can mark speakers as employees
- Can associate with existing employee records

### 4. **Learning & Storage**
- System saves confirmed speaker data
- Creates/updates employee voice profiles
- Stores voice characteristics for future use

### 5. **Future Identification**
- New recordings use learned voice characteristics
- Improved accuracy for known speakers
- Automatic employee tagging

## Benefits

### 🎯 **Improved Accuracy**
- Reduces manual speaker identification work
- Learns from user corrections
- Builds comprehensive voice profiles

### ⚡ **Time Savings**
- Automatic name extraction from titles
- One-click employee association
- Batch speaker confirmation

### 📊 **Better Analytics**
- Accurate speaker attribution
- Employee performance tracking
- Voice pattern analysis

### 🔄 **Scalable Learning**
- System improves over time
- Voice profiles become more accurate
- Reduces need for manual intervention

## Testing

Run the test script to see the system in action:

```bash
node test-speaker-identification.js
```

The test demonstrates:
- Name extraction from various title formats
- Speaker confirmation workflow
- Employee matching
- Voice characteristics analysis

## Future Enhancements

### 🎤 **Advanced Voice Analysis**
- Real-time voice recognition
- Accent and dialect detection
- Emotional tone analysis

### 🤖 **AI-Powered Matching**
- Machine learning for speaker identification
- Automatic voice profile updates
- Predictive speaker matching

### 📱 **Mobile Integration**
- Voice recording with automatic speaker detection
- Real-time speaker identification
- Offline voice profile storage

### 🔗 **Third-Party Integration**
- Calendar integration for meeting participants
- CRM integration for customer identification
- Video conferencing platform integration

## Configuration

### Environment Variables
```env
# Enable/disable speaker confirmation dialog
ENABLE_SPEAKER_CONFIRMATION=true

# Minimum confidence threshold for auto-confirmation
SPEAKER_CONFIDENCE_THRESHOLD=0.8

# Maximum number of speakers to auto-detect
MAX_AUTO_DETECTED_SPEAKERS=5
```

### Customization Options
- Custom name extraction patterns
- Voice characteristic thresholds
- Employee matching criteria
- Dialog appearance timing

## Troubleshooting

### Common Issues

#### Names Not Extracted
- Check title format matches supported patterns
- Verify name validation rules
- Review exclude word list

#### Dialog Not Appearing
- Ensure recording status is 'completed'
- Check if names were extracted from title
- Verify dialog hasn't been dismissed

#### Employee Matching Fails
- Check employee database connectivity
- Verify name format consistency
- Review matching algorithm parameters

### Debug Mode
Enable debug logging to troubleshoot issues:

```javascript
// In browser console
localStorage.setItem('speaker-debug', 'true');
```

## Support

For issues or questions about the Enhanced Speaker Identification System:

1. Check the test script output
2. Review browser console for errors
3. Verify database table creation
4. Test with sample recording titles

The system is designed to be robust and self-improving, learning from user interactions to provide increasingly accurate speaker identification.
