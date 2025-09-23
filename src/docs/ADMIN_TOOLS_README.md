# Admin Tools & Automation System

This document describes the comprehensive administrative tools and automation system implemented for the Echo AI Scribe application.

## Overview

The admin tools system provides:
- **Real Administrative Utilities**: Database backup, maintenance, security audits, and health checks
- **Data Export/Import System**: Multi-format export (CSV, JSON, PDF) with filtering and date ranges
- **Automation Engine**: Rule-based automation with schedule, event, and webhook triggers
- **Visual Automation Builder**: User-friendly interface for creating and managing automation rules
- **Monitoring & Logging**: Execution history, performance tracking, and error reporting

## Core Components

### 1. AdminTools Hook (`useAdminTools.ts`)

Provides real administrative utilities:

```typescript
const {
  isRunning,
  createDatabaseBackup,
  runHealthCheck,
  getDatabaseStats,
  clearCache,
  runDatabaseMaintenance,
  runSecurityAudit,
  exportSystemLogs,
  reindexSearch
} = useAdminTools();
```

**Features:**
- **Database Backup**: Creates full JSON backups of all tables
- **Health Check**: Tests database, storage, auth, and performance
- **Security Audit**: Scans for security issues and generates reports
- **Cache Management**: Clears application caches and storage
- **Database Maintenance**: Cleanup old data and optimize performance
- **System Logs**: Export activity logs for the last 30 days
- **Search Reindexing**: Rebuild search indexes for better performance

### 2. Data Export Hook (`useDataExport.ts`)

Comprehensive data export system:

```typescript
const {
  isExporting,
  exportUsers,
  exportRecordings,
  exportChatSessions,
  exportAuditLogs,
  importUsers
} = useDataExport();
```

**Export Formats:**
- **CSV**: Standard comma-separated values
- **Excel**: Excel-compatible CSV with BOM
- **JSON**: Structured data with metadata
- **PDF**: Report format with analytics

**Export Types:**
- **Users**: Profile data with roles and activity
- **Recordings**: Metadata with analytics and transcripts
- **Chat Sessions**: Session data with message counts
- **Audit Logs**: System activity and task logs

**Features:**
- Date range filtering
- Field selection
- Custom filters (status, type, etc.)
- Progress tracking
- Error handling
- Bulk import from CSV

### 3. Automation System

#### Rule Engine (`utils/automation/ruleEngine.ts`)

Core automation processing:

```typescript
// Define automation rules
interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  // ... statistics and metadata
}

// Execute rules
const result = await ruleEngine.executeRule(ruleId, context);
```

**Trigger Types:**
- **Schedule**: Cron-based scheduling
- **Event**: Database/application events
- **Webhook**: HTTP endpoint triggers
- **Manual**: User-initiated execution

**Action Types:**
- **Send Email**: Email notifications
- **Create Task**: Generate system tasks
- **Update Record**: Modify database records
- **Send Notification**: In-app notifications
- **Call Webhook**: HTTP requests to external services
- **Run Query**: Execute database queries
- **Export Data**: Generate data exports

#### Scheduler (`utils/automation/scheduler.ts`)

Handles scheduled automation:

```typescript
const scheduler = new AutomationScheduler();
scheduler.start(); // Begin monitoring scheduled jobs
scheduler.addJob(rule); // Add scheduled rule
const upcomingRuns = scheduler.getUpcomingRuns(ruleId, 5);
```

**Features:**
- Cron expression parsing
- Timezone support
- Next run calculation
- Job monitoring
- Execution tracking

#### Event System (`utils/automation/eventSystem.ts`)

Event-driven automation:

```typescript
// Register event rules
eventSystem.registerRule(rule);

// Emit events
await eventSystem.emitEvent({
  event: EventTypes.RECORDING_CREATED,
  data: recordingData,
  timestamp: new Date().toISOString()
});
```

**Pre-defined Events:**
- User events (created, updated, login, logout)
- Recording events (created, processed, failed)
- Task events (created, completed, updated)
- Chat events (started, message, ended)
- System events (startup, error, backup)
- Security events (breach, failed login)

### 4. Automation Hook (`useAutomation.ts`)

React hook for automation management:

```typescript
const {
  rules,
  isLoading,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  executeRule,
  getStats,
  getExecutionHistory
} = useAutomation();
```

**Rule Management:**
- Create new automation rules
- Update existing rules
- Enable/disable rules
- Delete rules
- Manual execution
- View execution history

**Statistics:**
- Total/active rules
- Execution counts
- Success rates
- Error tracking

## User Interface Components

### 1. AdminTools Page (`pages/admin/AdminTools.tsx`)

Main administrative dashboard:

**Features:**
- System statistics display
- Database stats (users, recordings, storage usage)
- Quick action buttons
- Tool execution with real-time status
- Progress indicators
- Success/error notifications

**Tool Categories:**
- **Maintenance**: Cache clearing, database optimization, search reindexing
- **Backup**: Database backup creation and verification
- **Diagnostics**: Health checks, security audits, performance monitoring
- **Documentation**: CLI and API documentation access

### 2. AutomationBuilder Page (`pages/admin/AutomationBuilder.tsx`)

Visual automation management:

**Features:**
- Rule creation dialog with form validation
- Rule listing with status indicators
- Execution statistics dashboard
- Rule details modal
- Enable/disable toggles
- Manual execution buttons
- Delete confirmations

**Rule Configuration:**
- Name and description
- Trigger type selection
- Cron expression input
- Event type selection
- Action configuration
- Condition setup

### 3. DataExportDialog Component (`components/admin/DataExportDialog.tsx`)

Advanced data export interface:

**Features:**
- Export type selection (users, recordings, chats, audit logs)
- Format selection (CSV, Excel, JSON, PDF)
- Field selection with checkboxes
- Advanced filtering options
- Date range selection
- Real-time preview
- Progress tracking

## Usage Examples

### Creating a Scheduled Backup

```typescript
const backupRule = await createRule({
  name: 'Weekly Database Backup',
  description: 'Create database backup every Sunday at 2 AM',
  trigger: {
    type: 'schedule',
    config: { cron: '0 2 * * 0', timezone: 'UTC' }
  },
  conditions: [],
  actions: [{
    type: 'export_data',
    config: {
      export_type: 'json',
      filename: 'weekly_backup_${timestamp}.json'
    }
  }]
});
```

### Event-Driven Processing

```typescript
const processingRule = await createRule({
  name: 'Auto-Process Recordings',
  description: 'Automatically process new recordings',
  trigger: {
    type: 'event',
    config: { event: 'recording.created' }
  },
  conditions: [{
    field: 'data.status',
    operator: 'equals',
    value: 'uploaded'
  }],
  actions: [{
    type: 'update_record',
    config: {
      table: 'recordings',
      updates: { status: 'processing' }
    }
  }, {
    type: 'send_notification',
    config: {
      message: 'Recording processing started',
      type: 'info'
    }
  }]
});
```

### Exporting User Data

```typescript
const result = await exportUsers({
  format: 'csv',
  includeFields: ['email', 'full_name', 'created_at', 'roles'],
  dateRange: {
    start: '2024-01-01T00:00:00Z',
    end: '2024-12-31T23:59:59Z'
  },
  filters: {
    role: 'user'
  }
});
```

## Error Handling

The system includes comprehensive error handling:

- **Validation**: Input validation for rules and exports
- **Execution Errors**: Graceful handling of action failures
- **Network Issues**: Retry logic for webhook calls
- **Database Errors**: Transaction rollbacks and recovery
- **User Feedback**: Toast notifications for all operations

## Security Considerations

- **Role-Based Access**: Admin-only access to tools
- **Audit Logging**: All admin actions are logged
- **Data Validation**: Input sanitization and validation
- **Rate Limiting**: Protection against automation abuse
- **Secure Export**: Sanitized data in exports
- **Permission Checks**: Verification before sensitive operations

## Performance

- **Async Operations**: Non-blocking execution
- **Batch Processing**: Efficient bulk operations
- **Memory Management**: Streaming for large exports
- **Caching**: Optimized data retrieval
- **Progress Tracking**: Real-time status updates

## Testing

Run the admin tools test suite:

```typescript
import { runAdminToolsTests } from '@/test/admin-tools-test';

// Execute all tests
const success = runAdminToolsTests();
```

**Test Coverage:**
- Rule engine execution
- Scheduler functionality
- Event system processing
- Data export operations
- Error scenarios
- Edge cases

## Future Enhancements

1. **Advanced Conditions**: Complex rule conditions with AND/OR logic
2. **Rule Templates**: Pre-built rule templates for common scenarios
3. **Visual Rule Builder**: Drag-and-drop rule creation interface
4. **Integration APIs**: REST/GraphQL APIs for external automation
5. **Machine Learning**: Intelligent rule suggestions based on usage patterns
6. **Workflow Chains**: Multi-step automation workflows
7. **Real-time Monitoring**: Live dashboard for automation monitoring
8. **Custom Actions**: Plugin system for custom action types

## Conclusion

This admin tools and automation system provides a comprehensive solution for:
- Administrative task automation
- Data management and export
- System monitoring and maintenance
- Event-driven processing
- Operational efficiency

The system is designed to be extensible, secure, and user-friendly while providing powerful automation capabilities that eliminate manual administrative tasks.