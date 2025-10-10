# Support Mode Scoring Toggle Feature

**Date**: 2025-10-10
**Status**: ✅ Implemented
**Feature Type**: Admin-Controlled Setting

---

## 🎯 Overview

This feature allows administrators to control whether numerical ECI scores are displayed in support mode coaching insights. When disabled, the UI emphasizes coaching and qualitative feedback over quantitative metrics.

### Problem Solved
Support stakeholders wanted to see **coaching insights** rather than **numerical scores** in the ECI Quality Framework analysis. However, removing scores entirely would eliminate valuable metrics for admins and managers.

### Solution
Admin-configurable toggle that controls score visibility organization-wide while preserving all underlying data and calculations.

---

## 🏗️ Architecture

### Database Layer
**New Table**: `organization_settings`
- Stores feature flags and configuration settings
- Organization-scoped with RLS policies
- JSONB values for flexible configuration schemas
- Auto-updates timestamps and tracking

**Migration**: `supabase/migrations/20251010170000_create_organization_settings.sql`

**Default Settings**:
```json
{
  "support_mode.show_scores": {"enabled": true},
  "support_mode.score_display_style": {"style": "percentage"}
}
```

### Service Layer
**File**: `src/services/organizationSettingsService.ts`

**Key Methods**:
- `getSupportModeShowScores()` - Get score visibility setting
- `updateSupportModeShowScores(enabled)` - Update setting
- `getAllSettings()` - Fetch all organization settings
- Generic CRUD operations for future settings

### React Query Hooks
**File**: `src/hooks/useOrganizationSettings.ts`

**Specialized Hooks**:
- `useSupportModeShowScores()` - Score visibility with mutations
- `useSupportModeDisplayStyle()` - Display style management
- Generic hooks for any setting key

**Features**:
- 5-minute cache staleTime
- Automatic query invalidation on updates
- Loading and error states
- Optimistic defaults

### Admin UI
**File**: `src/pages/admin/SupportSettings.tsx`

**Components**:
1. **Toggle Switch** - Enable/disable scores
2. **Preview Cards** - Side-by-side comparison
3. **Use Cases Guide** - When to use each mode
4. **Live Examples** - Mock ECI sections
5. **Impact Notice** - Organization-wide alert

**Route**: `/admin/support-settings`
**Permission**: `admin.support.manage`
**Navigation**: Organization > Support Settings

### UI Integration
**File**: `src/components/coach/ECICoachingInsights.tsx` (lines 527-558)

**Conditional Rendering**:
```typescript
{showScores ? (
  // Scores ON: Show percentages and Y/N/U counts
  <div className="text-right">
    <div className="text-lg font-bold">75%</div>
    <div className="text-xs">5Y / 2N / 1U</div>
  </div>
) : (
  // Scores OFF: Show qualitative indicators
  <Badge variant="outline">
    Strong Performance
  </Badge>
)}
```

**Score Ranges**:
- **80-100%**: "Strong Performance" (green)
- **60-79%**: "Good Progress" (yellow)
- **0-59%**: "Needs Improvement" (orange)

---

## 🔐 Security & Permissions

### Permission System
**New Permission**: `admin.support.manage`
- Added to `src/admin/permissions.ts`
- Route protected in admin portal
- Default: Admins only

### RLS Policies
1. **Read Access**: All authenticated users for their organization
2. **Write Access**: Admins only
3. **Service Role**: Full access for edge functions

### Multi-Tenant Support
- Organization-scoped by `organization_id`
- Default organization: `'default'`
- Extensible for future multi-tenant scenarios

---

## 📊 User Experience

### Admin Workflow
1. Navigate to **Admin Portal** → **Organization** → **Support Settings**
2. Toggle **"Display ECI Scores in Support Mode"** switch
3. Preview changes using side-by-side comparison
4. Click **"Save Changes"** (only visible when modified)
5. See success confirmation alert

### Support User Experience
**Scores Enabled (Current Default)**:
```
┌─────────────────────────────────┐
│ 💚 Care for Customer            │
│ 75%  |  5Y / 2N / 1U        [^]│
└─────────────────────────────────┘
```

**Scores Disabled (New Option)**:
```
┌─────────────────────────────────┐
│ 💚 Care for Customer            │
│ Strong Performance          [^] │
└─────────────────────────────────┘
```

### Impact
- **Immediate**: Changes apply instantly to all users
- **Non-breaking**: All data and calculations remain intact
- **Reversible**: Can be toggled back anytime
- **Organization-wide**: Applies to all support mode recordings

---

## 🧪 Testing Checklist

### Database
- [x] Migration creates `organization_settings` table
- [x] RLS policies enforce organization boundaries
- [x] Default settings inserted correctly
- [x] Timestamps auto-update on changes

### Service Layer
- [x] `getSupportModeShowScores()` returns default true
- [x] `updateSupportModeShowScores()` persists changes
- [x] Settings cached for 5 minutes
- [x] Error handling for failed operations

### Admin UI
- [ ] Settings page loads without errors
- [ ] Toggle switch syncs with database value
- [ ] Save button only shows when changed
- [ ] Preview cards display correctly
- [ ] Success alert shows after save
- [ ] Permission enforcement works

### Coaching UI
- [ ] Scores visible when setting is true
- [ ] Qualitative badges show when setting is false
- [ ] No layout breaks in either mode
- [ ] Real-time updates when setting changes
- [ ] Loading states handled gracefully

### Integration
- [ ] Admin nav shows "Support Settings" menu item
- [ ] Route permissions protect access
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Responsive design works on mobile

---

## 🚀 Deployment Steps

### 1. Database Migration
```bash
npx supabase db push
# or for production:
npx supabase db push --linked
```

**Verify**:
```sql
SELECT * FROM organization_settings
WHERE setting_key = 'support_mode.show_scores';
```

### 2. Frontend Deployment
No special steps needed - standard React build process.

### 3. Post-Deployment Verification
1. Login as admin user
2. Navigate to `/admin/support-settings`
3. Toggle setting and verify UI changes
4. Open support recording and check ECI section
5. Verify scores show/hide based on setting

---

## 🔮 Future Enhancements

### Phase 2 Features
- [ ] **User-level preferences** - Individual override of org setting
- [ ] **Display style options** - Letter grades (A-F), qualitative, etc.
- [ ] **Granular control** - Hide scores per section (e.g., only hide Call Flow)
- [ ] **Role-based visibility** - Managers see scores, agents don't
- [ ] **Scheduled toggling** - Auto-hide scores during onboarding period

### Extension Points
- Framework for other organization settings
- Reusable settings management pattern
- Multi-tenant organization support
- Settings audit log and history

---

## 📝 Code Files Changed/Added

### New Files (5)
1. `supabase/migrations/20251010170000_create_organization_settings.sql`
2. `src/services/organizationSettingsService.ts`
3. `src/hooks/useOrganizationSettings.ts`
4. `src/pages/admin/SupportSettings.tsx`
5. `docs/SUPPORT_MODE_SCORING_FEATURE.md` (this file)

### Modified Files (4)
1. `src/admin/permissions.ts` - Added `admin.support.manage`
2. `src/admin/routes.tsx` - Added Support Settings route mapping
3. `src/App.tsx` - Added route definition (line 125)
4. `src/components/coach/ECICoachingInsights.tsx` - Conditional rendering

**Total Lines Added**: ~950
**Total Lines Modified**: ~25

---

## 🆘 Troubleshooting

### Issue: 404 error on /admin/support-settings
**Cause**: Route not registered in App.tsx
**Fix**: ✅ RESOLVED - Route added at line 125 in `src/App.tsx`

### Issue: Settings not loading
**Cause**: RLS policies blocking access
**Fix**: Ensure user has valid `organization_id` in `users` table

### Issue: Changes not persisting
**Cause**: Missing admin role in `user_roles`
**Fix**: Grant admin role to user in database

### Issue: UI not updating after toggle
**Cause**: React Query cache not invalidating
**Fix**: Check network tab for mutation success, manually clear cache

### Issue: Permission denied error
**Cause**: User lacks `admin.support.manage` permission
**Fix**: Update `role_permissions` table for user's role

---

## 📚 Related Documentation
- [Admin Permissions Registry](./ADMIN_PERMISSIONS.md)
- [ECI Quality Framework](./ECI_FRAMEWORK.md)
- [Organization Settings Schema](../supabase/migrations/20251010170000_create_organization_settings.sql)

---

**Implemented By**: Claude Code Assistant
**Reviewed By**: _Pending_
**Last Updated**: 2025-10-10
