# Database Functions Documentation

This document provides comprehensive documentation for all admin database functions implemented in the SoundScribe application.

## Overview

The database foundation includes **15 core RPC functions** that support all admin operations in the frontend. These functions provide real data calculations, audit logging, user management, system monitoring, and maintenance operations.

## Function Categories

### 1. User Management Functions

#### `get_user_statistics()`
**Purpose**: Returns comprehensive user statistics for admin dashboard  
**Returns**: `JSONB`  
**Usage**: Called by `useKpiMetrics` hook for user-related KPIs

**Return Structure**:
```json
{
  "totalUsers": 150,
  "activeUsers": 89,
  "inactiveUsers": 61,
  "adminUsers": 3,
  "userGrowthPercent": 12.5,
  "recentSignups": 5,
  "lastUpdated": "2025-06-21T10:30:00Z"
}
```

#### `get_user_activity_summary(p_user_id UUID)`
**Purpose**: Get detailed activity summary for a specific user  
**Parameters**: 
- `p_user_id`: UUID of the user
**Returns**: `JSONB`  
**Usage**: User management interface for individual user details

**Return Structure**:
```json
{
  "totalRecordings": 25,
  "lastActivity": "2025-06-20T15:45:00Z",
  "avgSessionLength": 120.5,
  "mostActiveDay": "Wednesday",
  "generatedAt": "2025-06-21T10:30:00Z"
}
```

#### `bulk_user_operations(p_operation TEXT, p_user_ids UUID[], p_options JSONB)`
**Purpose**: Perform bulk operations on multiple users  
**Parameters**:
- `p_operation`: Operation type ('activate', 'deactivate', 'delete_recordings', 'export_data')
- `p_user_ids`: Array of user IDs to process
- `p_options`: Additional options as JSON
**Returns**: `JSONB`  
**Usage**: User management bulk actions

**Supported Operations**:
- `activate`: Activate user accounts
- `deactivate`: Deactivate user accounts  
- `delete_recordings`: Delete all recordings for users
- `export_data`: Export user data

### 2. System Monitoring Functions

#### `get_database_stats()`
**Purpose**: Returns database statistics and metrics  
**Returns**: `JSONB`  
**Usage**: System monitoring and health checks

**Return Structure**:
```json
{
  "databaseSize": 524288000,
  "tableCounts": {
    "recordings": 1250,
    "profiles": 150,
    "auditLogs": 2500,
    "userRoles": 180,
    "systemMetrics": 500
  },
  "connectionCount": 12,
  "lastVacuum": "2025-06-21T02:00:00Z",
  "generatedAt": "2025-06-21T10:30:00Z"
}
```

#### `calculate_storage_metrics()`
**Purpose**: Calculate storage usage metrics and trends  
**Returns**: `JSONB`  
**Usage**: Storage analytics dashboard

**Return Structure**:
```json
{
  "totalStorageBytes": 1073741824,
  "totalStorageMB": 1024.0,
  "averageFileSizeBytes": 857600,
  "largestFileSizeBytes": 5242880,
  "storageGrowthPercent": 15.2,
  "totalFiles": 1250,
  "lastUpdated": "2025-06-21T10:30:00Z"
}
```

#### `get_system_health_metrics()`
**Purpose**: Returns system health indicators  
**Returns**: `JSONB`  
**Usage**: System health monitoring

**Return Structure**:
```json
{
  "errorRate": 2.5,
  "avgResponseTime": 3.2,
  "activeSessions": 25,
  "healthScore": "good",
  "lastChecked": "2025-06-21T10:30:00Z"
}
```

### 3. KPI Calculation Functions

#### `calculate_admin_kpis()`
**Purpose**: Calculate comprehensive KPI metrics for admin dashboard  
**Returns**: `JSONB`  
**Usage**: Primary function called by `useKpiMetrics` hook

**Return Structure** (matches frontend `KpiData` interface):
```json
{
  "instantSummaries": {
    "today": 45,
    "last7Days": 280,
    "percentChange": 12.5,
    "status": "up"
  },
  "repAdoption": {
    "rate": 75.2,
    "activeReps": 89,
    "totalReps": 150,
    "percentChange": 8.1,
    "status": "healthy"
  },
  "coachingScore": {
    "current": 82.4,
    "delta": 5.7,
    "trend": "improving",
    "status": "healthy"
  },
  "failureRate": {
    "current": 2.1,
    "failed": 3,
    "retried": 0,
    "status": "healthy"
  },
  "systemHealth": {
    "totalRecordings": 45,
    "weeklyRecordings": 280,
    "avgProcessingTime": 3.2,
    "storageUsed": 1024.0,
    "lastUpdated": "2025-06-21T10:30:00Z"
  }
}
```

### 4. Audit and Logging Functions

#### `log_audit_event(...)`
**Purpose**: Log comprehensive audit events  
**Parameters**:
- `p_action`: Action performed
- `p_resource_type`: Type of resource affected
- `p_resource_id`: ID of the resource (optional)
- `p_old_values`: Previous values (optional)
- `p_new_values`: New values (optional)
- `p_metadata`: Additional metadata (optional)
- `p_severity`: Event severity ('info', 'warning', 'critical', 'error')
- `p_ip_address`: User's IP address (optional)
**Returns**: `UUID` (audit log ID)  
**Usage**: Called throughout the application for audit trails

#### `log_admin_action(...)`
**Purpose**: Log admin-specific actions with enhanced details  
**Parameters**:
- `p_action`: Admin action performed
- `p_resource_type`: Resource type
- `p_resource_id`: Resource ID (optional)
- `p_details`: Action details as JSON
- `p_ip_address`: IP address (optional)
**Returns**: `UUID`  
**Usage**: Admin interface actions

#### `get_audit_summary(p_days INTEGER, p_severity TEXT)`
**Purpose**: Get audit log summary for specified period  
**Parameters**:
- `p_days`: Number of days to include (default: 7)
- `p_severity`: Severity filter ('all', 'info', 'warning', 'critical', 'error')
**Returns**: `JSONB`  
**Usage**: Audit dashboard and reporting

### 5. Admin Settings Functions

#### `get_admin_setting(p_setting_key TEXT)`
**Purpose**: Retrieve admin setting value  
**Parameters**:
- `p_setting_key`: Setting key to retrieve
**Returns**: `JSONB`  
**Usage**: Used by `useAdminSession` for session timeout settings

#### `set_admin_setting(...)`
**Purpose**: Set or update admin setting  
**Parameters**:
- `p_setting_key`: Setting key
- `p_setting_value`: Setting value as JSON
- `p_setting_type`: Data type ('string', 'number', 'boolean', 'object', 'array')
- `p_description`: Setting description (optional)
- `p_is_public`: Whether setting is publicly visible
**Returns**: `BOOLEAN`  
**Usage**: Admin settings management

### 6. Maintenance Functions

#### `cleanup_old_data(p_days_to_keep INTEGER)`
**Purpose**: Clean up old audit logs and metrics  
**Parameters**:
- `p_days_to_keep`: Number of days to retain (default: 90)
**Returns**: `JSONB`  
**Usage**: Automated data maintenance

#### `export_admin_data(...)`
**Purpose**: Export admin data for reporting  
**Parameters**:
- `p_data_type`: Type of data to export ('audit_logs', 'user_activity', 'system_metrics')
- `p_format`: Export format (default: 'json')
- `p_date_from`: Start date (optional)
- `p_date_to`: End date (optional)
**Returns**: `JSONB`  
**Usage**: Data export and reporting

## Security and Permissions

### Row Level Security (RLS)
All admin functions implement proper RLS policies:
- **Admin-only functions**: Restricted to users with admin role
- **Audit logs**: Read-only for admins, insert-only for system
- **User data**: Filtered based on user permissions

### Function Security
- All functions use `SECURITY DEFINER` for controlled access
- Proper parameter validation and SQL injection prevention
- Comprehensive error handling and logging

## Performance Optimizations

### Database Indexes
The following indexes are created for optimal performance:
```sql
-- Recording queries
CREATE INDEX idx_recordings_user_id_created_at ON recordings(user_id, created_at);
CREATE INDEX idx_recordings_status_created_at ON recordings(status, created_at);
CREATE INDEX idx_recordings_file_size ON recordings(file_size) WHERE file_size IS NOT NULL;

-- Profile queries  
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Audit log queries
CREATE INDEX idx_audit_logs_user_action_date ON audit_logs(user_id, action, created_at);
CREATE INDEX idx_audit_logs_resource_date ON audit_logs(resource_type, resource_id, created_at);

-- Metrics queries
CREATE INDEX idx_system_metrics_name_time ON system_metrics(metric_name, recorded_at);
```

### Query Optimization
- Functions use efficient aggregation queries
- Proper date range filtering with indexes
- Minimal data processing in complex calculations
- Cached results where appropriate

## Frontend Integration

### Hook Mappings
| Frontend Hook | Database Functions Used |
|---------------|------------------------|
| `useKpiMetrics` | `calculate_admin_kpis()` |
| `useUserManagement` | `log_audit_event()`, `get_user_statistics()` |
| `useAdminSession` | `get_admin_setting()`, `log_audit_event()` |
| `useUserRole` | `grant_admin_role()` (existing) |

### Error Handling
All functions include comprehensive error handling:
- Graceful handling of null/empty data
- Meaningful error messages
- Fallback values for missing data
- Transaction rollback on critical errors

## Testing

### Test Coverage
The `test_admin_functions.sql` file provides:
- **15 function tests** covering all core functions
- **Performance benchmarks** for critical operations
- **Data integrity validation** between functions and raw data
- **Error handling verification** for edge cases

### Running Tests
```sql
-- Execute the test suite
\i supabase/test_admin_functions.sql

-- Expected output: All tests should pass with ✓ indicators
```

## Monitoring and Maintenance

### Health Checks
Regular monitoring should include:
- Function execution times (should be < 1 second for KPIs)
- Error rates in audit logs
- Data consistency between functions and raw queries
- Storage growth trends

### Maintenance Tasks
- Run `cleanup_old_data()` monthly to manage storage
- Monitor audit log growth and adjust retention as needed
- Review and optimize slow-performing functions
- Update admin settings as requirements change

## Migration Notes

### Dependencies
This migration requires:
- Previous audit logs table migration (20250621000200)
- Admin metrics table migration (20250621000300)
- User roles system (20250614000002)

### Rollback
If rollback is needed:
```sql
-- Drop all added functions
DROP FUNCTION IF EXISTS get_user_statistics();
DROP FUNCTION IF EXISTS calculate_storage_metrics();
-- ... (continue for all functions)
```

## Support and Troubleshooting

### Common Issues
1. **Permission Denied**: Ensure user has admin role in user_roles table
2. **Null Results**: Check if adequate test data exists
3. **Performance Issues**: Verify indexes are created properly
4. **Data Inconsistency**: Run integrity tests to identify issues

### Debug Queries
```sql
-- Check if user has admin access
SELECT * FROM user_roles WHERE user_id = auth.uid() AND role = 'admin';

-- Verify function exists
SELECT proname FROM pg_proc WHERE proname = 'calculate_admin_kpis';

-- Check recent audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

**Created**: 2025-06-21  
**Version**: 1.0  
**Migration**: 20250621000400_comprehensive_admin_functions.sql