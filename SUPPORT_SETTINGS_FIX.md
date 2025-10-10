# Support Settings 404 Fix

## Issue
Getting 404 error when navigating to `/admin/support-settings`

## Root Cause
The route was missing from `src/App.tsx`. While the component, service layer, and admin navigation were all properly configured, the React Router route definition was not added.

## Fix Applied
Added the missing route to `App.tsx` at line 125:

```tsx
<Route path="/admin/support-settings" element={<AdminDashboard />} />
```

## Files Modified
- `src/App.tsx` - Added route definition

## Verification Steps

### 1. Check Route Registration
```bash
# Search for the route in App.tsx
grep -n "support-settings" src/App.tsx
# Should show: 125:  <Route path="/admin/support-settings" element={<AdminDashboard />} />
```

### 2. Verify Component Resolution
The route resolution flow:
1. `App.tsx` → Routes to `<AdminDashboard />`
2. `AdminDashboard.tsx` → Calls `resolveAdminComponent(location.pathname)`
3. `admin/routes.tsx` → Maps `/admin/support-settings` to `SupportSettings` component
4. `SupportSettings.tsx` → Renders the settings page

### 3. Test Navigation
1. Start dev server: `npm run dev`
2. Login as admin user
3. Navigate to **Admin Portal**
4. Click **Organization** → **Support Settings**
5. Verify page loads without 404 error

### 4. Verify Permission Enforcement
1. The route requires `admin.support.manage` permission
2. Check `admin/permissions.ts` - permission is registered
3. Check `AdminDashboard.tsx` - permission check at line 50-51

### 5. Test Functionality
- [ ] Toggle switch loads with current setting value
- [ ] Preview cards display correctly
- [ ] Save button appears when toggle changes
- [ ] Save persists to database
- [ ] Success alert shows after save
- [ ] Changes reflect in ECI coaching insights

## Complete Route Flow

```
User clicks "Support Settings"
    ↓
Browser navigates to /admin/support-settings
    ↓
App.tsx matches route → <AdminDashboard />
    ↓
AdminDashboard.tsx checks:
  - User authenticated? ✓
  - User is admin? ✓
  - Has admin.support.manage permission? ✓
    ↓
Calls resolveAdminComponent('/admin/support-settings')
    ↓
admin/routes.tsx returns <SupportSettings />
    ↓
SupportSettings page renders
    ↓
Hook useSupportModeShowScores() fetches setting
    ↓
Page displays with current toggle state
```

## All Admin Routes Pattern

The pattern used by all admin routes:
```tsx
// In App.tsx
<Route path="/admin/{page-name}" element={<AdminDashboard />} />

// In admin/routes.tsx
'/admin/{page-name}': ComponentName,

// In admin/permissions.ts
'/admin/{page-name}': ['permission.key'],
```

Our new route follows this pattern correctly.

## Status
✅ **FIXED** - Route now properly registered and accessible

## Related Files
- `src/App.tsx` - Route definition (FIXED)
- `src/pages/admin/SupportSettings.tsx` - Page component ✓
- `src/admin/routes.tsx` - Component mapping ✓
- `src/admin/permissions.ts` - Permission mapping ✓
- `src/services/organizationSettingsService.ts` - Service layer ✓
- `src/hooks/useOrganizationSettings.ts` - React hooks ✓
