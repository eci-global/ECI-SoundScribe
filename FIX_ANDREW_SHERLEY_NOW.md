# Fix Andrew Sherley's Recording Link - Quick Start Guide

## TL;DR - Just Run These 2 Scripts

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run **`scripts/fix-rls-policies.sql`** (fixes permissions)
3. Run **`scripts/link-andrew-sherley-recording.sql`** (links the recording)
4. Done! ✅

---

## Step-by-Step Instructions

### Step 1: Fix Row Level Security Policies

**Problem**: The app can't read employee data due to overly restrictive RLS policies.

**Solution**:
1. Open your Supabase Dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **"New query"**
4. Open the file: `scripts/fix-rls-policies.sql`
5. Copy the entire contents and paste into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)

**Expected Output**:
```
✅ Created policy: authenticated users can read employees table
✅ Created policy: authenticated users can read employee_call_participation
✅ Created policy: authenticated users can read employee_scorecards
✅ RLS Policy Fix Complete!
```

**What this does**:
- Allows authenticated users to read the `employees` table
- Allows authenticated users to read the `employee_call_participation` table
- Allows authenticated users to create new participation records

---

### Step 2: Link the Recording to Andrew Sherley

**Problem**: Recording `b983a9f3-ca13-4ba1-a877-d35489dda124` is not linked to Andrew Sherley's profile.

**Solution**:
1. Stay in **SQL Editor** (same tab)
2. Click **"New query"**
3. Open the file: `scripts/link-andrew-sherley-recording.sql`
4. Copy the entire contents and paste into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter)

**Expected Output**:
```
✅ Found: Andrew Sherley (asherley@ecisolutions.com, status: active)
✅ Found recording: "..."
✅ No existing participation records (clean state)
✅ Successfully created participation record!
✅ Set recording.employee_name = "Andrew Sherley"
🎉 SUCCESS! Recording is now linked to Andrew Sherley!
```

**What this does**:
- Verifies Andrew Sherley exists (id: `f625947d-aa0d-4e1f-8daa-33ac30ec1d46`)
- Verifies the recording exists (id: `b983a9f3-ca13-4ba1-a877-d35489dda124`)
- Removes any incorrect existing participation records
- Creates a new `employee_call_participation` record linking them
- Updates the `recordings.employee_name` field

---

### Step 3: Verify It Worked

1. **Clear browser cache**:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Navigate to Andrew's profile**:
   ```
   /employees/f625947d-aa0d-4e1f-8daa-33ac30ec1d46
   ```

3. **Click the "Recordings" tab**

4. **You should see the recording!** 🎉

---

## Troubleshooting

### Issue 1: "Recording not found"

**Symptom**: Script says recording `b983a9f3-ca13-4ba1-a877-d35489dda124` doesn't exist.

**Solution**: The recording ID might be wrong. Run this query to find the correct one:

```sql
-- Find recent recordings
SELECT id, title, status, employee_name, created_at
FROM recordings
ORDER BY created_at DESC
LIMIT 20;

-- Search for recordings with "Andrew" in transcript
SELECT id, title, status, employee_name, created_at
FROM recordings
WHERE transcript ILIKE '%andrew%'
   OR transcript ILIKE '%sherley%'
   OR transcript ILIKE '%shirley%'
ORDER BY created_at DESC
LIMIT 10;
```

Then update `scripts/link-andrew-sherley-recording.sql` line 8:
```sql
recording_id UUID := 'YOUR_CORRECT_RECORDING_ID_HERE';
```

---

### Issue 2: "Recording still not showing on profile"

**Possible Causes**:

#### A. Wrong employee ID in URL
Make sure the URL is exactly:
```
/employees/f625947d-aa0d-4e1f-8daa-33ac30ec1d46
```

Verify Andrew's ID:
```sql
SELECT id, first_name, last_name, email
FROM employees
WHERE first_name = 'Andrew' AND last_name = 'Sherley';
```

#### B. Browser cache
- Hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Or clear all browser data (Ctrl + Shift + Delete)

#### C. JavaScript error
- Open browser console (F12)
- Look for red error messages
- Check the Network tab for failed API calls

#### D. Participation record doesn't exist
Verify the link was created:
```sql
SELECT *
FROM employee_call_participation
WHERE employee_id = 'f625947d-aa0d-4e1f-8daa-33ac30ec1d46'
  AND recording_id = 'b983a9f3-ca13-4ba1-a877-d35489dda124';
```

If no results, re-run `scripts/link-andrew-sherley-recording.sql`.

---

### Issue 3: RLS policies causing problems

Check current policies:
```sql
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('employees', 'employee_call_participation')
ORDER BY tablename, policyname;
```

If policies are still restrictive, re-run `scripts/fix-rls-policies.sql`.

---

## What If I Need to Link More Recordings?

### Option A: Automatic Detection (if name is in transcript)

Call the Edge Function:
```sql
SELECT net.http_post(
  url := 'https://YOUR_PROJECT.supabase.co/functions/v1/extract-employee-name',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
  body := '{"recording_id": "RECORDING_ID_HERE"}'::jsonb
);
```

Or use the Supabase Functions dashboard to invoke `extract-employee-name`.

### Option B: Manual Linking (SQL)

```sql
-- Replace RECORDING_ID with the actual recording UUID
INSERT INTO employee_call_participation (
  recording_id,
  employee_id,
  participation_type,
  confidence_score,
  manually_tagged,
  speaker_segments
) VALUES (
  'RECORDING_ID',  -- Replace this
  'f625947d-aa0d-4e1f-8daa-33ac30ec1d46',  -- Andrew's ID
  'primary',
  1.0,
  true,
  jsonb_build_object(
    'detection_method', 'manual',
    'detected_name', 'Andrew Sherley',
    'name_type', 'full_name',
    'reasoning', 'Manually linked by administrator'
  )
)
ON CONFLICT (recording_id, employee_id) DO NOTHING;
```

---

## Summary

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Run `fix-rls-policies.sql` | ✅ RLS policies updated |
| 2 | Run `link-andrew-sherley-recording.sql` | ✅ Recording linked to Andrew |
| 3 | Clear cache & refresh | ✅ Recording appears on profile |

**Recording ID**: `b983a9f3-ca13-4ba1-a877-d35489dda124`
**Andrew's Employee ID**: `f625947d-aa0d-4e1f-8daa-33ac30ec1d46`
**Profile URL**: `/employees/f625947d-aa0d-4e1f-8daa-33ac30ec1d46`

---

## Why Did This Happen?

See **`WHY_ANDREW_NOT_FOUND.md`** for a detailed technical explanation of the RLS issue.

**Short version**: Row Level Security policies were too restrictive, blocking the app from reading employee participation records even though they existed in the database.

---

## Need More Help?

Check these files:
- **`WHY_ANDREW_NOT_FOUND.md`** - Detailed explanation of the RLS issue
- **`ANDREW_SHERLEY_FIX_GUIDE.md`** - Comprehensive troubleshooting guide
- **`scripts/fix-rls-policies.sql`** - RLS policy fix script
- **`scripts/link-andrew-sherley-recording.sql`** - Recording linking script

Or check:
- Browser console (F12) for JavaScript errors
- Supabase Dashboard → Logs → Functions for Edge Function errors
- src/services/employeeService.ts:1017-1175 for the frontend query logic
