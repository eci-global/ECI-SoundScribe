# Admin Permissions Registry

This project uses a simple role → permission model for the admin portal. Permissions are defined in src/admin/permissions.ts and enforced in:
- Nav filtering: src/components/admin/AdminLayout.tsx
- Route guard: src/pages/AdminDashboard.tsx

## Adding a new admin page/route
1. Add your component and update src/admin/routes.tsx with the new path → component.
2. Choose a permission key (e.g., dmin.tools.view) or add a new key to PermissionKey in src/admin/permissions.ts.
3. Map the route to the permission in ROUTE_PERMISSIONS in the same file.
4. Optionally add the nav item in dminNav (routes.tsx). It will be auto-hidden for users lacking permission.

## Managing role permissions
Use the Roles & Access page (/admin/roles-access) to toggle which permissions each role (admin|manager|user) has. This writes to ole_permissions with:
- ole
- esource_name = "admin_portal"
- permissions: string[] (list of permission keys)

## Notes
- Admin role implicitly has all permissions (fallback *).
- Legacy ccess_policies/esource_permissions are deprecated.
- Use ole_permissions exclusively for admin portal authorization.
