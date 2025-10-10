# Okta SSO Setup Checklist

## Status: 🟡 Packages Installed - Configuration Needed

---

## ✅ Completed Steps

- [x] Database migration created (`supabase/migrations/20251010170000_create_sso_settings.sql`)
- [x] Okta configuration file created (`src/config/oktaConfig.ts`)
- [x] SSO service layer created (`src/services/ssoService.ts`)
- [x] Okta authentication hook created (`src/hooks/useOktaAuth.ts`)
- [x] OAuth callback component created (`src/components/auth/OktaCallback.tsx`)
- [x] Auth provider updated with Okta support (`src/hooks/useAuth.tsx`)
- [x] Login page updated with Okta button (`src/components/auth/AuthPage.tsx`)
- [x] App routes updated with `/login/callback` (`src/App.tsx`)
- [x] Admin SSO management page created (`src/pages/admin/SSOManagement.tsx`)
- [x] Admin routes configured for SSO management
- [x] **Okta SDK packages installed** (`@okta/okta-react`, `@okta/okta-auth-js`)

---

## 🔄 Next Steps to Complete Setup

### Step 1: Apply Database Migration

```bash
npx supabase db push
```

This creates the required database tables:
- `user_sso_settings` - User SSO configuration
- `sso_enforcement_log` - Audit trail for SSO changes

### Step 2: Configure Okta Application

1. **Log in to Okta Admin Dashboard**
   - Visit: `https://your-tenant-admin.okta.com`

2. **Create New Application**
   - Applications → Create App Integration
   - Sign-in method: **OIDC - OpenID Connect**
   - Application type: **Single-Page Application (SPA)**

3. **Configure Application Settings**
   - **App integration name**: SoundScribe (or your preference)
   - **Grant types**:
     - ☑ Authorization Code
     - ☑ Refresh Token (optional)
   - **Sign-in redirect URIs**:
     - Development: `http://localhost:5173/login/callback`
     - Production: `https://your-domain.com/login/callback`
   - **Sign-out redirect URIs**:
     - Development: `http://localhost:5173`
     - Production: `https://your-domain.com`
   - **Controlled access**: Choose who can access (All users, specific groups, etc.)

4. **Note Down Credentials**
   After creating the app, note:
   - **Client ID**: `0oa...` (starts with 0oa)
   - **Okta domain**: `your-tenant.okta.com`
   - **Issuer**: Usually `https://your-tenant.okta.com/oauth2/default`

### Step 3: Configure Environment Variables

Create or update `.env` in your project root:

```env
# Existing Supabase config
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key

# Okta Configuration
VITE_OKTA_DOMAIN=your-tenant.okta.com
VITE_OKTA_CLIENT_ID=0oa...
VITE_OKTA_ISSUER=https://your-tenant.okta.com/oauth2/default
VITE_OKTA_REDIRECT_URI=http://localhost:5173/login/callback
```

**Important**:
- Don't include `https://` in `VITE_OKTA_DOMAIN`
- Do include `https://` in `VITE_OKTA_ISSUER`
- Match redirect URI exactly with Okta app config

### Step 4: Restart Development Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

The Okta button should now appear on the login page!

---

## 🧪 Testing the Integration

### Test 1: Verify Okta Button Appears

1. Navigate to login page: `http://localhost:5173`
2. ✅ Should see "Sign in with Okta" button below email field
3. ✅ Should see "Or continue with email" divider

**If button doesn't appear:**
- Check `.env` file has all `VITE_OKTA_*` variables
- Restart dev server
- Check browser console for config errors

### Test 2: Test Okta Login Flow

1. Click "Sign in with Okta" button
2. ✅ Should redirect to Okta login page
3. Enter Okta credentials
4. ✅ Should redirect back to `http://localhost:5173/login/callback`
5. ✅ Should process callback and redirect to app
6. ✅ Should be logged in successfully

**If login fails:**
- Check Okta redirect URIs match exactly
- Verify client ID is correct
- Check browser console for errors
- Review Okta app logs in admin dashboard

### Test 3: Test Email/Password Still Works

1. Navigate to login page
2. Enter email and password (existing user)
3. Click "Sign In"
4. ✅ Should log in successfully
5. ✅ Both authentication methods should coexist

### Test 4: Test SSO Requirement

1. Log in as admin
2. Navigate to: Admin → Organization → SSO Management
3. Find a test user
4. Click "Enable SSO"
5. Enter reason: "Testing SSO enforcement"
6. Log out
7. Try to log in as that test user
8. Enter email
9. ✅ Password field should disappear
10. ✅ Only Okta button should be visible
11. ✅ Clicking Okta should work

### Test 5: Test Admin SSO Management

1. Navigate to: `/admin/sso-management`
2. ✅ Should see dashboard with user statistics
3. ✅ Should see list of all users
4. ✅ Can search users by email/name
5. ✅ Can toggle SSO requirement per user
6. ✅ Can view audit logs tab
7. ✅ Can bulk enable by domain

---

## 🔒 Security Checklist

- [ ] **HTTPS in Production**: Ensure production uses HTTPS (Okta requires it)
- [ ] **Redirect URI Whitelist**: Only include legitimate redirect URIs in Okta
- [ ] **Environment Variables**: Never commit `.env` to git (use `.env.example`)
- [ ] **RLS Policies**: Verify database policies are enabled (already configured)
- [ ] **Admin Access**: Verify only admins can access `/admin/sso-management`
- [ ] **Audit Logging**: Verify all SSO changes are being logged
- [ ] **MFA in Okta**: Consider enabling MFA for Okta users
- [ ] **Token Expiration**: Review Okta token lifetime settings
- [ ] **User Communication**: Plan to notify users before enabling SSO

---

## 📋 Common Issues & Solutions

### Issue: "Okta is not configured"

**Cause**: Environment variables not set or dev server not restarted

**Solution**:
1. Check `.env` file exists and has all `VITE_OKTA_*` variables
2. Restart dev server: `npm run dev`
3. Clear browser cache

### Issue: "Redirect URI mismatch"

**Cause**: Okta app redirect URI doesn't match `.env` setting

**Solution**:
1. Check Okta app settings: Sign-in redirect URIs
2. Must exactly match `VITE_OKTA_REDIRECT_URI`
3. Common mistake: Missing trailing slash or http vs https

### Issue: "Cannot read properties of null (reading 'getUser')"

**Cause**: Okta configuration is invalid or incomplete

**Solution**:
1. Verify all Okta credentials in `.env`
2. Check Okta app is Active (not Inactive)
3. Verify issuer URL is correct

### Issue: Database migration fails

**Cause**: Tables might already exist or Supabase not connected

**Solution**:
```bash
# Check migration status
npx supabase migration list --linked

# If needed, apply specific migration
npx supabase db execute --file supabase/migrations/20251010170000_create_sso_settings.sql --linked
```

### Issue: User can still use password after enabling SSO

**Cause**: Browser cache or user needs to log out

**Solution**:
1. User must log out completely
2. Clear browser cache
3. Try in incognito/private window
4. Verify `sso_required = true` in database

---

## 🚀 Production Deployment Checklist

Before deploying to production:

- [ ] **Update Okta Redirect URIs**
  - Add production domain to Okta app
  - Example: `https://soundscribe.com/login/callback`

- [ ] **Update Environment Variables**
  - Set `VITE_OKTA_REDIRECT_URI` to production URL
  - Verify all other Okta variables are correct

- [ ] **Apply Database Migration**
  ```bash
  npx supabase db push
  ```

- [ ] **Test Production Okta Flow**
  - Test login on production URL
  - Verify redirect works correctly
  - Test both Okta and email/password

- [ ] **Monitor Initial Rollout**
  - Watch Supabase logs for errors
  - Monitor Okta admin dashboard
  - Check SSO enforcement logs

- [ ] **User Communication**
  - Notify users about new SSO option
  - Provide instructions for Okta login
  - Set up support channel for questions

---

## 📞 Support Resources

### Okta Documentation
- [Okta SPA Quick Start](https://developer.okta.com/docs/guides/sign-into-spa-redirect/react/main/)
- [OIDC & OAuth 2.0 API](https://developer.okta.com/docs/reference/api/oidc/)
- [Okta Auth JS SDK](https://github.com/okta/okta-auth-js)

### Project Documentation
- `docs/OKTA_IMPLEMENTATION_COMPLETE.md` - Full technical implementation guide
- `docs/SSO_MANAGEMENT_UI.md` - Admin UI usage guide
- `docs/OKTA_SETUP.md` - Original setup documentation

### Debug Mode

Enable verbose logging:
```typescript
// In src/hooks/useOktaAuth.ts, uncomment console.log statements
// Or add this to .env:
VITE_DEBUG_OKTA=true
```

---

## ✅ You're Ready When...

- [x] Okta SDK packages installed
- [ ] Database migration applied
- [ ] Okta application configured
- [ ] Environment variables set
- [ ] Dev server restarted
- [ ] Login page shows Okta button
- [ ] Test user can log in with Okta
- [ ] Email/password still works
- [ ] Admin SSO management page accessible
- [ ] SSO enforcement working

---

**Current Status**: SDK installed ✅ - Configure Okta app and environment variables next!

**Next Step**: Apply database migration with `npx supabase db push`
