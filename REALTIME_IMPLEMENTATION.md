# Real-time Implementation Guide

## Overview

This document describes the comprehensive real-time functionality implemented for the EchoAI admin interface. The system provides live data updates, real-time notifications, and instant UI synchronization across all admin components.

## Architecture

### Core Components

1. **Enhanced useSupabaseLive Hook** (`src/hooks/useSupabaseLive.ts`)
   - Provides real-time data subscriptions with authentication
   - Handles connection management and retry logic
   - Supports custom event handlers and filtering
   - Includes connection status monitoring

2. **Real-time KPI Metrics** (`src/hooks/useKpiMetrics.ts`)
   - Live KPI calculations with automatic updates
   - Multiple data source subscriptions
   - Debounced updates to prevent excessive refreshes
   - Connection status and error handling

3. **Live User Management** (`src/hooks/useUserManagement.ts`)
   - Real-time user and role updates
   - Instant reflection of permission changes
   - Live user activity monitoring

4. **Admin Notifications System** (`src/hooks/useAdminNotifications.ts`)
   - Real-time event notifications
   - Critical security alerts
   - System health monitoring
   - Desktop and sound notifications

5. **UI Components**
   - `RealtimeStatus.tsx` - Connection status display
   - `NotificationPanel.tsx` - Live notification feed
   - Enhanced admin pages with live indicators

## Database Schema

### Enabled Tables for Real-time

```sql
-- Tables with real-time subscriptions enabled
- recordings (main data source)
- profiles (user management)
- user_roles (permission changes)
- audit_logs (security monitoring)
- admin_metrics (system health)
```

### Key Functions

```sql
-- Main KPI calculation function
calculate_admin_kpis() -> JSONB

-- Critical event notification triggers
notify_critical_events() -> TRIGGER
```

## Real-time Features

### 1. Live Data Updates

**KPI Metrics**
- Instant summary statistics
- Rep adoption rates
- Coaching scores
- Failure monitoring
- System health metrics

**User Management**
- Live user list updates
- Real-time role assignments
- Activity status changes
- Permission modifications

**Audit Logs**
- Live security event stream
- Critical alert notifications
- Failed action monitoring
- System activity tracking

### 2. Notification System

**Event Types**
- `info` - General notifications
- `warning` - Important alerts
- `error` - Critical issues
- `success` - Positive confirmations

**Notification Sources**
- `system` - System-generated events
- `user_activity` - User actions
- `recording` - Recording processing
- `security` - Security events
- `performance` - Performance alerts

**Features**
- Desktop notifications (with permission)
- Sound alerts for critical events
- Auto-hide for non-persistent notifications
- Read/unread status tracking
- Notification filtering and search

### 3. Connection Management

**Status Monitoring**
- Real-time connection status
- Last update timestamps
- Connection health indicators
- Automatic reconnection

**Error Handling**
- Graceful degradation to static data
- Retry mechanisms
- User-initiated reconnection
- Error state visualization

## Implementation Details

### Authentication & Security

The real-time system uses Supabase's built-in authentication with row-level security (RLS) policies:

```javascript
// Example subscription with authentication
const subscription = supabase
  .channel(`admin-updates-${user?.id}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'recordings'
  }, handleUpdate)
  .subscribe();
```

**Security Features:**
- User-specific channel names
- RLS policy enforcement
- Admin-only access to sensitive data
- IP address tracking in audit logs

### Performance Optimizations

1. **Debounced Updates**
   - Prevent excessive refresh calls
   - Batch multiple rapid changes
   - Configurable refresh intervals

2. **Smart Caching**
   - Local state management
   - Conditional updates
   - Memory leak prevention

3. **Connection Pooling**
   - Shared connections where possible
   - Proper cleanup on unmount
   - Efficient subscription management

### Error Handling & Fallbacks

1. **Graceful Degradation**
   ```javascript
   // Fallback to static data on connection failure
   if (connectionError) {
     setData(getMockData(tableName));
   }
   ```

2. **Retry Logic**
   - Automatic reconnection attempts
   - Exponential backoff
   - User-initiated retry options

3. **Error Visualization**
   - Clear connection status indicators
   - Error messages and recovery actions
   - Offline mode notifications

## Usage Examples

### Basic Real-time Hook

```javascript
import { useSupabaseLive } from '@/hooks/useSupabaseLive';

function MyComponent() {
  const { 
    data, 
    loading, 
    error, 
    isConnected, 
    refresh,
    reconnect 
  } = useSupabaseLive('recordings', {
    orderBy: { column: 'created_at', ascending: false },
    limit: 50,
    enableRealtime: true,
    onInsert: (payload) => console.log('New recording:', payload.new),
    onUpdate: (payload) => console.log('Updated recording:', payload.new)
  });

  return (
    <div>
      {isConnected ? '🟢 Live' : '🔴 Offline'}
      {data?.map(record => <div key={record.id}>{record.title}</div>)}
    </div>
  );
}
```

### Admin Notifications

```javascript
import { useAdminNotifications } from '@/hooks/useAdminNotifications';

function AdminNotifications() {
  const { 
    notifications, 
    unreadCount, 
    isConnected,
    markAsRead,
    clearAll 
  } = useAdminNotifications({
    maxNotifications: 50,
    autoHideDelay: 5000,
    enableSound: true,
    enableDesktop: true
  });

  return (
    <NotificationPanel
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkAsRead={markAsRead}
      onClearAll={clearAll}
    />
  );
}
```

### Real-time Status Component

```javascript
import { RealtimeStatus } from '@/components/admin/RealtimeStatus';

function AdminDashboard() {
  const connections = {
    kpi: kpiLive,
    users: usersLive,
    recordings: recordingsConnected,
    audit: auditConnected,
    notifications: notificationsConnected
  };

  return (
    <RealtimeStatus
      connections={connections}
      lastUpdated={lastUpdateTimes}
      unreadNotifications={unreadCount}
      onReconnectAll={reconnectAll}
    />
  );
}
```

## Testing

### Automated Testing

Run the comprehensive test suite:

```bash
node test-realtime-functionality.js
```

**Test Coverage:**
- Database connectivity
- Table accessibility
- Real-time subscriptions
- KPI function execution
- Notification triggers
- Authentication with WebSockets
- Performance metrics

### Manual Testing

1. **Connection Status**
   - Check live indicators in admin interface
   - Verify reconnection functionality
   - Test graceful degradation

2. **Data Updates**
   - Create/update records in database
   - Verify instant UI updates
   - Check notification delivery

3. **Error Scenarios**
   - Disconnect internet connection
   - Test reconnection behavior
   - Verify fallback data display

## Deployment & Configuration

### Environment Variables

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Setup

1. Run the comprehensive real-time enablement script:
   ```sql
   \i enable_comprehensive_realtime.sql
   ```

2. Verify real-time is enabled:
   ```sql
   SELECT schemaname, tablename 
   FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   ```

### Performance Tuning

1. **Connection Limits**
   - Monitor concurrent connections
   - Implement connection pooling if needed
   - Set appropriate limits in Supabase

2. **Update Frequency**
   - Adjust refresh intervals based on usage
   - Use debouncing for high-frequency updates
   - Monitor database load

3. **Notification Volume**
   - Implement notification filtering
   - Set appropriate retention periods
   - Monitor notification delivery rates

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**
   ```
   Error: WebSocket connection failed
   Solution: Check authentication, network connectivity, and Supabase status
   ```

2. **Missing Real-time Events**
   ```
   Issue: Data changes not reflected in UI
   Solution: Verify table is added to supabase_realtime publication
   ```

3. **Performance Issues**
   ```
   Issue: Slow updates or UI lag
   Solution: Check subscription count, implement debouncing, optimize queries
   ```

### Debug Tools

1. **Browser Developer Tools**
   - WebSocket connection status
   - Network tab for connection issues
   - Console logs for subscription events

2. **Supabase Dashboard**
   - Real-time logs
   - Database activity
   - API usage metrics

3. **Custom Debug Functions**
   ```javascript
   // Enable debug logging
   localStorage.setItem('supabase-debug', 'true');
   ```

## Monitoring & Metrics

### Key Metrics to Monitor

1. **Connection Health**
   - WebSocket connection uptime
   - Reconnection frequency
   - Error rates

2. **Performance**
   - Update latency
   - Subscription count
   - Memory usage

3. **User Experience**
   - Notification delivery rates
   - UI responsiveness
   - Error recovery time

### Alerts & Monitoring

Set up monitoring for:
- High disconnection rates
- Failed notification delivery
- Database connection issues
- Performance degradation

## Future Enhancements

### Planned Features

1. **Advanced Filtering**
   - Complex real-time queries
   - User-specific data filtering
   - Geographic filtering

2. **Collaboration Features**
   - Multi-admin presence indicators
   - Real-time cursors
   - Collaborative editing

3. **Performance Optimizations**
   - Smart subscription management
   - Predictive caching
   - Edge deployment

4. **Enhanced Notifications**
   - Rich media notifications
   - Custom notification rules
   - Integration with external services

## Conclusion

The real-time implementation provides a comprehensive live data experience for the admin interface. With proper setup and monitoring, it ensures administrators have instant access to critical system information and can respond quickly to important events.

For support or questions, refer to the test suite output or check the individual component documentation.