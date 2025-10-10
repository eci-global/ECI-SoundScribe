# SAML SSO Troubleshooting Guide

## Current Issue

**Error**: `AuthApiError: No SSO provider assigned for this domain`

## What We've Done ✅

1. ✅ Created Okta SAML application
2. ✅ Added SAML provider via Supabase CLI
3. ✅ Configured attribute mappings
4. ✅ Enabled SAML 2.0 in Supabase Dashboard
5. ✅ Provider ID: `a00d47ee-0539-46cc-adc0-3b9a2ffbc0de`
6. ✅ Domain: `ecisolutions.com`

## The Problem

Despite CLI configuration showing the provider exists, the Supabase Auth API returns "No SSO provider assigned" when:
- Checking SSO by domain
- Attempting to sign in via SSO

## Possible Causes

### 1. API Propagation Delay
- CLI changes may take time to propagate to Auth API
- **Solution**: Wait 5-10 minutes and try again

### 2. Dashboard vs CLI Mismatch
- Dashboard toggle enabled but provider not properly linked
- **Solution**: Check dashboard shows the Okta provider listed

### 3. Missing Dashboard Configuration Step
- Some SAML setups require additional dashboard configuration
- **Solution**: Look for "Add Identity Provider" button in dashboard

### 4. Supabase Plan Limitation
- SAML SSO might require specific plan features
- **Solution**: Verify Pro plan includes SAML (it should)

## Diagnostic Steps

### Step 1: Verify in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/auth/providers
2. Scroll to "SAML 2.0" section
3. Check:
   - [ ] SAML 2.0 toggle is ON (green/enabled)
   - [ ] Your Okta provider is listed under "Identity Providers"
   - [ ] Provider shows "Active" status
   - [ ] Domain shows "ecisolutions.com"

### Step 2: Check for "Add Provider" Button

Some Supabase projects require you to:
1. Enable SAML 2.0 (you did this)
2. **THEN** click "Add Identity Provider" in the dashboard
3. Paste the Okta metadata URL there

**Look for**: A button or link that says "Add Identity Provider" or "Configure Provider"

### Step 3: Verify Provider List in Dashboard

After enabling SAML, you should see:
```
Identity Providers
├─ Okta (or your provider name)
   ├─ Type: SAML 2.0
   ├─ Entity ID: http://www.okta.com/exkwascjyz0SQ6Vai697
   ├─ Domains: ecisolutions.com
   └─ Status: Active
```

If you DON'T see this list, the provider isn't properly connected.

### Step 4: CLI Re-verification

Run this command to verify CLI configuration:

```bash
npx supabase sso list --project-ref qinkldgvejheppheykfl
```

Should show:
```
TYPE     | IDENTITY PROVIDER ID | DOMAINS          | STATUS
---------|----------------------|------------------|--------
SAML 2.0 | a00d47ee-...         | ecisolutions.com | Active
```

## Potential Solutions

### Solution A: Re-add Provider in Dashboard (Recommended)

If the dashboard doesn't show the provider listed:

1. In Supabase Dashboard → Authentication → Providers → SAML 2.0
2. Look for "Add Identity Provider" or similar button
3. Click it
4. Fill in:
   - **Provider Name**: Okta
   - **Metadata URL**: `https://ecisolutions.okta.com/app/exkwascjyz0SQ6Vai697/sso/saml/metadata`
   - **Domains**: `ecisolutions.com`
   - **Attribute Mapping**:
     - email → email
     - name → name
     - firstName → firstName
     - lastName → lastName
5. Save

### Solution B: Contact Supabase Support

If the provider still doesn't work:
1. Go to: https://supabase.com/dashboard/support
2. Create ticket with:
   - Subject: "SAML SSO provider not accessible via API"
   - Project Ref: qinkldgvejheppheykfl
   - Provider ID: a00d47ee-0539-46cc-adc0-3b9a2ffbc0de
   - Error: "No SSO provider assigned for this domain"
   - Note: CLI shows provider exists but API returns error

### Solution C: Temporary Workaround (For Testing)

Use OAuth/OIDC instead of SAML temporarily:
1. Create Okta OIDC app (not SAML)
2. Configure as OAuth provider in Supabase Dashboard
3. This will work immediately for testing
4. Switch back to SAML when issue resolved

## What to Tell Supabase Support

If you need to contact support, provide:

```
Project Ref: qinkldgvejheppheykfl
Provider ID: a00d47ee-0539-46cc-adc0-3b9a2ffbc0de
Domain: ecisolutions.com

Issue:
- SAML provider configured via CLI successfully
- SAML 2.0 enabled in dashboard
- Provider shows in CLI: `npx supabase sso list`
- But API returns: "No SSO provider assigned for this domain"
- Cannot authenticate users via SSO

Expected: signInWithSSO should work
Actual: AuthApiError: No SSO provider assigned for this domain

Okta metadata URL:
https://ecisolutions.okta.com/app/exkwascjyz0SQ6Vai697/sso/saml/metadata
```

## Next Steps

1. **Check dashboard carefully** - Look for the provider list under SAML 2.0
2. **Look for "Add Provider" button** - You may need to add it there too
3. **Wait 10 minutes** - Try SSO login again (propagation delay)
4. **Contact support** - If still not working after above steps

---

**Status**: Waiting for dashboard verification
**Last Updated**: 2025-01-10
