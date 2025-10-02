# Employee Call Attribution and Scorecard Tracking System

## Overview

This system provides comprehensive employee tracking, voice detection, and performance analytics for the SoundScribe application. It enables automatic employee identification during call processing, detailed performance tracking, and manager coaching tools.

## Features Implemented

### 1. Automatic Employee Detection
- **Voice Analysis Integration**: Extends Whisper analysis to identify known employee voices
- **Manual Tagging**: Allows manual employee tagging during upload
- **Confidence Scoring**: Provides confidence levels for voice detection accuracy
- **Voice Profile Training**: System for training employee voice profiles using sample recordings

### 2. Employee Profile Pages
- **Recording History**: All recordings where employee participated
- **Performance Trends**: BDR scoring trends over time with visual charts
- **Analytics Dashboard**: Performance metrics, strengths, and improvement areas
- **Coaching History**: Manager feedback and coaching notes timeline

### 3. Scorecard Aggregation Views
- **Performance Summaries**: Monthly/quarterly performance summaries
- **Criteria Tracking**: Specific improvement tracking across different criteria
- **Peer Comparison**: Anonymized benchmarking against team members
- **Manager Notes**: Timeline of coaching notes and feedback

### 4. Employee Search and Directory
- **Advanced Search**: Search recordings by employee name, department, role
- **Filtering**: Filter scorecard views by employee, team, or performance criteria
- **Team Grouping**: Team-based employee organization
- **Performance Sorting**: Sort by score, calls, or recent activity

### 5. Performance Dashboard
- **Score Progression**: Charts showing individual and team performance trends
- **Coaching Effectiveness**: Metrics on coaching session success rates
- **Team Comparisons**: Individual vs team performance comparisons
- **Analytics**: Comprehensive performance analytics and insights

## Database Schema

### Core Tables

#### `employees`
- Employee profiles with basic information
- Links to user accounts and team assignments
- Voice profile references

#### `teams`
- Team organization and management
- Department and manager assignments

#### `employee_call_participation`
- Tracks employee participation in specific recordings
- Talk time analysis and confidence scores
- Manual vs automatic tagging

#### `employee_scorecards`
- Individual performance evaluations
- Detailed scoring breakdown by criteria
- Manager feedback and coaching notes

#### `employee_performance_trends`
- Aggregated performance data by time period
- Trend analysis and improvement tracking

#### `manager_coaching_notes`
- Manager feedback and coaching sessions
- Action items and follow-up tracking
- Priority and status management

#### `employee_voice_profiles`
- Voice characteristics for identification
- Training data and confidence thresholds
- Sample recording references

## API Endpoints

### Employee Management
- `GET /employees` - List employees with filters
- `GET /employees/:id` - Get employee details with analytics
- `POST /employees` - Create new employee
- `PUT /employees/:id` - Update employee information

### Voice Detection
- `POST /detect-employee-voice` - Detect employees in recording
- `POST /train-employee-voice` - Train voice profile for employee
- `GET /voice-profiles/:employeeId` - Get voice profile status

### Performance Analytics
- `GET /employees/:id/scorecards` - Get employee scorecards
- `GET /employees/:id/analytics` - Get comprehensive analytics
- `GET /teams/:id/performance` - Get team performance report

## Components

### Core Components
- `EmployeeManagement` - Main management interface
- `EmployeeDirectory` - Employee search and listing
- `EmployeeProfile` - Individual employee profile page
- `EmployeeDashboard` - Performance dashboard
- `EmployeeVoiceDetection` - Voice detection interface
- `EmployeeScorecardManager` - Scorecard management

### Key Features

#### Voice Detection
```typescript
// Automatic voice detection
const detectionResult = await EmployeeService.detectEmployeeVoice(recordingId);

// Manual employee tagging
await EmployeeService.recordCallParticipation(recordingId, employeeId, {
  participation_type: 'primary',
  manually_tagged: true
});
```

#### Performance Analytics
```typescript
// Get employee performance summary
const summary = await EmployeeService.getEmployeePerformanceSummary(employeeId);

// Get comprehensive analytics
const analytics = await EmployeeService.getEmployeeAnalytics(employeeId);
```

#### Scorecard Management
```typescript
// Create scorecard
const scorecard = await EmployeeService.createScorecard({
  employee_id: employeeId,
  recording_id: recordingId,
  overall_score: 4.2,
  criteria_scores: {...},
  strengths: [...],
  improvements: [...]
});
```

## Supabase Functions

### `detect-employee-voice`
- Analyzes recording for employee voice patterns
- Compares against trained voice profiles
- Returns confidence scores and suggestions
- Automatically records participation

### `train-employee-voice`
- Trains voice profiles using sample recordings
- Calculates voice characteristics
- Sets confidence thresholds
- Updates training status

## Integration Points

### Recording Processing
- Integrates with existing Whisper analysis
- Extends speaker identification with employee matching
- Automatically tags employees during processing

### Coaching System
- Links with existing BDR coaching evaluations
- Extends coaching data with employee attribution
- Provides manager feedback tools

### Analytics Dashboard
- Integrates with existing performance metrics
- Extends analytics with employee-specific data
- Provides team and individual comparisons

## Usage Examples

### 1. Setting Up Employee Voice Profiles
```typescript
// Train voice profile for new employee
await EmployeeService.trainEmployeeVoiceProfile(employeeId, [
  'recording-1', 'recording-2', 'recording-3'
]);
```

### 2. Automatic Employee Detection
```typescript
// During recording processing
const detection = await EmployeeService.detectEmployeeVoice(recordingId);
if (detection.employee_id) {
  await EmployeeService.recordCallParticipation(recordingId, detection.employee_id, {
    participation_type: 'primary',
    confidence_score: detection.confidence
  });
}
```

### 3. Performance Tracking
```typescript
// Create performance scorecard
const scorecard = await EmployeeService.createScorecard({
  employee_id: employeeId,
  recording_id: recordingId,
  overall_score: 4.2,
  criteria_scores: {
    talkTimeRatio: { score: 4, maxScore: 4, weight: 25, feedback: 'Excellent' },
    objectionHandling: { score: 3, maxScore: 4, weight: 20, feedback: 'Good' }
  },
  strengths: ['Clear communication', 'Good rapport building'],
  improvements: ['Ask more open-ended questions']
});
```

### 4. Manager Coaching
```typescript
// Add coaching note
const note = await EmployeeService.createCoachingNote({
  employee_id: employeeId,
  manager_id: managerId,
  note_type: 'coaching',
  title: 'Discovery Questions Improvement',
  content: 'Focus on asking more open-ended questions...',
  priority: 'high',
  action_items: ['Practice 5 open-ended questions', 'Review discovery techniques']
});
```

## Performance Considerations

### Database Optimization
- Indexed queries for fast employee lookups
- Efficient aggregation queries for analytics
- Optimized voice profile matching

### Voice Detection
- Cached voice characteristics for fast matching
- Batch processing for multiple recordings
- Confidence threshold tuning

### Analytics
- Pre-calculated performance trends
- Efficient chart data generation
- Cached team comparisons

## Security and Privacy

### Row Level Security (RLS)
- Employees can only view their own data
- Managers can view their team members
- Admin access for system management

### Data Privacy
- Voice characteristics stored securely
- Employee data access controls
- Audit logging for sensitive operations

## Future Enhancements

### Planned Features
- Advanced voice analysis with machine learning
- Real-time performance notifications
- Integration with HR systems
- Mobile app for managers
- Advanced reporting and exports

### Scalability
- Voice profile clustering
- Distributed voice analysis
- Advanced caching strategies
- Performance monitoring

## Testing

### Unit Tests
- Employee service functions
- Voice detection algorithms
- Performance calculations
- Database operations

### Integration Tests
- End-to-end employee workflows
- Voice detection accuracy
- Performance analytics
- Manager coaching flows

### Performance Tests
- Large dataset handling
- Voice analysis speed
- Dashboard rendering
- Database query optimization

## Deployment

### Database Migration
```sql
-- Apply the employee tracking schema
\i supabase/migrations/20250120000001_employee_tracking_schema.sql
```

### Function Deployment
```bash
# Deploy Supabase functions
supabase functions deploy detect-employee-voice
supabase functions deploy train-employee-voice
```

### Environment Variables
```env
# Required for voice detection
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_region

# Voice analysis settings
VOICE_CONFIDENCE_THRESHOLD=0.7
VOICE_TRAINING_SAMPLES_MIN=3
```

## Monitoring and Maintenance

### Key Metrics
- Voice detection accuracy rates
- Employee participation tracking
- Performance trend analysis
- Coaching effectiveness

### Maintenance Tasks
- Regular voice profile updates
- Performance data cleanup
- Analytics cache refresh
- System health monitoring

This comprehensive employee tracking system provides the foundation for advanced performance management, automated employee identification, and detailed analytics for the SoundScribe application.
