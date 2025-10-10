# Okta SSO Integration Guide

## Overview

This project supports **hybrid authentication** - users can sign in with either:
1. **Email/Password** (existing Supabase authentication)
2. **Okta SSO** (new integration)

Admins can enforce SSO for specific users while keeping password authentication available for others.

---

## Prerequisites

Before starting, you'll need:
- ✅ An Okta tenant (e.g., `your-company.okta.com`)
- ✅ Admin access to your Okta dashboard
- ✅ Supabase project with admin access
- ✅ Node.js 20+ and npm installed

---

## Step 1: Configure Okta Application

### 1.1 Create a New Application in Okta

1. Log in to your Okta Admin Dashboard
2. Navigate to **Applications** → **Applications**
3. Click **Create App Integration**
4. Select:
   - **Sign-in method**: OIDC - OpenID Connect
   - **Application type**: Single-Page Application (SPA)
5. Click **Next**

### 1.2 Configure Application Settings

**Application Settings:**
- **App integration name**: `SoundScribe` (or your preference)
- **Grant type**: Check **Authorization Code** and **Refresh Token**
- **Sign-in redirect URIs**:
  ```
  http://localhost:5173/login/callback
  https://your-production-domain.com/login/callback
  ```
- **Sign-out redirect URIs**:
  ```
  http://localhost:5173
  https://your-production-domain.com
  ```
- **Controlled access**: Choose who can access (e.g., "Allow everyone in your organization to access")

### 1.3 Save Application Credentials

After creating the app, note down:
- **Client ID** (e.g., `0oa1234567890abcdef`)
- **Okta domain** (e.g., `dev-12345678.okta.com`)
- **Issuer URL** (usually `https://your-domain.okta.com/oauth2/default`)

---

## Step 2: Install Dependencies

```bash
npm install @okta/okta-react @okta/okta-auth-js
```

---

## Step 3: Configure Environment Variables

### 3.1 Update `.env` File

Add these variables to your `.env` file:

```env
# Okta Configuration
VITE_OKTA_DOMAIN=dev-12345678.okta.com
VITE_OKTA_CLIENT_ID=0oa1234567890abcdef
VITE_OKTA_ISSUER=https://dev-12345678.okta.com/oauth2/default
VITE_OKTA_REDIRECT_URI=http://localhost:5173/login/callback
```

**For production**, create `.env.production` with your production URLs:

```env
VITE_OKTA_REDIRECT_URI=https://your-domain.com/login/callback
```

---

## Step 4: Deploy Database Changes

Run the SSO settings migration:

```bash
# Apply migration to Supabase
npx supabase db push

# Or if using remote database
npx supabase migration up
```

This creates:
- `user_sso_settings` table - Tracks SSO requirements per user
- `sso_enforcement_log` table - Audit log for SSO changes

---

## Step 5: Complete Remaining Implementation

### Files Still Needed:

1. **`src/hooks/useOktaAuth.ts`** - Okta authentication hook using `@okta/okta-auth-js`
2. **`src/components/auth/OktaCallback.tsx`** - OAuth callback handler
3. **Update `src/hooks/useAuth.tsx`** - Add `signInWithOkta()` method
4. **Update `src/components/auth/AuthPage.tsx`** - Add "Sign in with Okta" button
5. **Update `src/App.tsx`** - Add `/login/callback` route
6. **`src/pages/admin/SSOManagement.tsx`** - Admin page for managing SSO

These files are **prepared but not yet implemented** to avoid package dependency issues until you install the Okta SDKs.

---

## Step 6: Okta User Provisioning

### Option A: Manual User Creation
1. Create users in Okta manually
2. Assign them to the SoundScribe application
3. Users will be provisioned in Supabase on first login

### Option B: SCIM Provisioning (Advanced)
1. Configure SCIM in Okta to auto-provision users
2. Requires additional Supabase Edge Function development
3. Out of scope for this initial integration

---

## Step 7: Testing SSO

### 7.1 Test Without SSO Requirement

1. Start the dev server: `npm run dev`
2. Navigate to login page
3. Both "Email/Password" and "Sign in with Okta" buttons should be visible
4. Click "Sign in with Okta"
5. You'll be redirected to Okta login
6. After successful login, you'll be redirected back to the app

### 7.2 Test With SSO Requirement

1. As an admin, navigate to `/admin/sso-management` (once implemented)
2. Find a user and toggle "Require SSO" to ON
3. Sign out and try to log in as that user with email/password
4. You should see a message: "SSO required for this account"
5. Only the "Sign in with Okta" button should be available

---

## Step 8: Managing SSO Requirements

### Via Admin UI (Once Implemented)

1. Navigate to `/admin/sso-management`
2. See list of all users with SSO status
3. Toggle SSO requirement per user
4. Bulk enable SSO for email domain (e.g., all `@company.com` users)

### Via Database (Emergency)

```sql
-- Enable SSO for a specific user
INSERT INTO user_sso_settings (user_id, sso_required, sso_provider)
VALUES ('user-uuid-here', true, 'okta')
ON CONFLICT (user_id) DO UPDATE SET sso_required = true;

-- Disable SSO for a user
UPDATE user_sso_settings
SET sso_required = false, sso_provider = 'email'
WHERE user_id = 'user-uuid-here';
```

---

## Architecture Overview

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ├────► Email/Password ────► Supabase Auth
       │
       └────► Okta SSO ──────────┐
                                  │
                                  ▼
                          ┌──────────────┐
                          │ Okta Tenant  │
                          │ (OAuth 2.0)  │
                          └──────┬───────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ /login/callback │
                        │   (OAuth Code)  │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────────┐
                        │ Create/Update User  │
                        │   in Supabase       │
                        └─────────────────────┘
```

### User Flow:

1. **User visits login page**
2. **Enters email** → System checks `user_sso_settings`
3. **If SSO required**: Only show "Sign in with Okta"
4. **If SSO optional**: Show both options
5. **If Okta selected**: Redirect to Okta login
6. **After Okta auth**: Callback creates/updates Supabase user
7. **Supabase session created**: User logged in

---

## Security Considerations

### ✅ Implemented:
- PKCE (Proof Key for Code Exchange) enabled
- HTTPS required in production
- Row-level security on SSO tables
- Audit logging for SSO changes

### 🔒 Best Practices:
1. **Never** store Okta tokens in localStorage (handled by SDK)
2. Use refresh tokens for long sessions
3. Enforce HTTPS in production
4. Regularly audit SSO enforcement logs
5. Enable MFA in Okta for all users

---

## Troubleshooting

### Issue: "Okta domain not configured"
**Solution**: Check `.env` file has all required `VITE_OKTA_*` variables

### Issue: "Redirect URI mismatch"
**Solution**: Ensure redirect URI in Okta app matches `.env` exactly

### Issue: "User not found after Okta login"
**Solution**: Check Supabase logs - user provisioning may have failed

### Issue: "SSO required but can still use password"
**Solution**: Check `user_sso_settings` table - `sso_required` should be `true`

---

## Migration Path for Existing Users

If you have existing users who need to transition to Okta:

1. **Communicate the change** to users in advance
2. **Enable SSO gradually** - don't force all users at once
3. **Test with pilot group** first
4. **Keep password auth enabled** during transition
5. **Monitor SSO logs** for issues
6. **Provide support documentation** for users

---

## Next Steps

After completing the setup:

1. ✅ Install Okta SDK packages
2. ✅ Implement remaining authentication hooks
3. ✅ Add Okta UI components
4. ✅ Build admin SSO management page
5. ✅ Test thoroughly in development
6. ✅ Deploy to production
7. ✅ Train admins on SSO management

---

## Support

For issues:
- **Okta Setup**: Refer to [Okta Developer Docs](https://developer.okta.com/docs/)
- **Integration Issues**: Check application logs and Supabase logs
- **User Problems**: Check `sso_enforcement_log` table for audit trail

---

## Summary

**Current Status**: ✅ Foundation complete, ready for SDK installation

**What's Done**:
- ✅ Database schema for SSO settings
- ✅ SSO service layer (`ssoService.ts`)
- ✅ Configuration management (`oktaConfig.ts`)
- ✅ Environment variable setup
- ✅ No mock data remaining

**What's Next**:
1. Install `@okta/okta-react` and `@okta/okta-auth-js`
2. Implement authentication hooks and components
3. Test SSO flow end-to-end
4. Deploy to production

You're now ready to add Okta to your project! 🚀
