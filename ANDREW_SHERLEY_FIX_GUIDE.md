# Fix Guide: Andrew Sherley Recording Not Linking

## Problem Summary

You updated a recording for Andrew Sherley at `/summaries/b983a9f3-ca13-4ba1-a877-d35489dda124`, but it's not linking to his employee profile even after "so many changes."

## Root Causes Identified

After extensive investigation, I've identified **3 critical issues**:

### Issue 1: Andrew Sherley Doesn't Exist in Employees Table ❌

The diagnostic scripts confirmed that **Andrew Sherley is NOT in the `employees` table**. The employee detection system can only link recordings to employees that exist in the database.

**Status**: Missing from database
**Impact**: Recording cannot be linked - there's no employee record to link to!

### Issue 2: Possible Recording ID Issue ⚠️

The path `/summaries/b983a9f3-ca13-4ba1-a877-d35489dda124` suggests this might be:
- A summary route (not the actual recording ID)
- A recording ID that exists but can't be accessed due to RLS policies
- An old/deleted recording

**Status**: Unable to verify due to RLS restrictions
**Impact**: Can't confirm if the recording exists or has a transcript

### Issue 3: Row Level Security (RLS) Blocking Access 🔒

The diagnostic scripts using the anon key couldn't retrieve ANY recordings, which indicates RLS policies are preventing access. This is why we couldn't search the database to find Andrew's recording.

**Status**: RLS policies block anon key from reading recordings table
**Impact**: Scripts can't diagnose or fix the issue automatically

## Solution Steps

### Step 1: Add Andrew Sherley to Employees Table

**You must do this first** before any linking can work!

#### Option A: Using Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor** → **employees** table
3. Click **Insert** → **Insert row**
4. Fill in the following fields:
   ```
   first_name: Andrew
   last_name: Sherley
   email: asherley@ecisolutions.com  (or correct email)
   status: active
   department: (fill in his department)
   role: (fill in his role)
   ```
5. Click **Save**
6. **Copy the generated `id` (UUID)** - you'll need this!

#### Option B: Using SQL (In Supabase SQL Editor)

```sql
-- Add Andrew Sherley to employees table
INSERT INTO employees (
  first_name,
  last_name,
  email,
  status,
  department,
  role,
  employee_id
) VALUES (
  'Andrew',
  'Sherley',
  'asherley@ecisolutions.com',  -- Update with correct email
  'active',
  'Sales',  -- Update with correct department
  'Sales Representative',  -- Update with correct role
  '140XXX'  -- Update with correct employee code if you have one
)
RETURNING id, first_name, last_name;
```

**Important**: Save the returned `id` (UUID) for Andrew Sherley!

### Step 2: Verify the Recording Exists

Since RLS is blocking the diagnostic scripts, you need to verify the recording manually:

1. **Open the app** and navigate to the recording
2. Go to: `/summaries/b983a9f3-ca13-4ba1-a877-d35489dda124`
3. **Check if it loads successfully**
4. **Open browser DevTools** (F12) → **Console** tab
5. Look for the **actual recording ID** in the console logs or network tab

Alternatively, check the database directly:

```sql
-- Run this in Supabase SQL Editor
SELECT
  id,
  title,
  status,
  employee_name,
  LENGTH(transcript) as transcript_length,
  created_at
FROM recordings
WHERE id = 'b983a9f3-ca13-4ba1-a877-d35489dda124'
  OR title ILIKE '%Andrew%'
  OR title ILIKE '%Sherley%'
ORDER BY created_at DESC
LIMIT 10;
```

### Step 3: Link the Recording to Andrew Sherley

Once you have:
- ✅ Andrew Sherley in the employees table
- ✅ The correct recording ID
- ✅ Confirmed the recording has a transcript

You have **3 options** to link them:

#### Option A: Automatic Detection (Recommended if name is in transcript)

If "Andrew" or "Sherley" is mentioned in the transcript, run:

```sql
-- Call the extract-employee-name function (in Supabase SQL Editor)
SELECT * FROM extract_employee_name('b983a9f3-ca13-4ba1-a877-d35489dda124');
```

Or use the Supabase Functions dashboard to invoke `extract-employee-name` with:
```json
{
  "recording_id": "b983a9f3-ca13-4ba1-a877-d35489dda124"
}
```

#### Option B: Manual Linking (If automatic detection fails)

If the name isn't clearly mentioned in the transcript, manually create the link:

```sql
-- Manually link recording to Andrew Sherley
-- Replace 'ANDREW_EMPLOYEE_UUID' with the actual UUID from Step 1
INSERT INTO employee_call_participation (
  recording_id,
  employee_id,
  participation_type,
  talk_time_seconds,
  talk_time_percentage,
  confidence_score,
  manually_tagged,
  speaker_segments
) VALUES (
  'b983a9f3-ca13-4ba1-a877-d35489dda124',  -- Recording ID
  'ANDREW_EMPLOYEE_UUID',  -- Replace with Andrew's employee UUID
  'primary',
  0,
  0,
  1.0,  -- High confidence for manual tags
  true,  -- This is a manual tag
  jsonb_build_object(
    'detection_method', 'manual',
    'detected_name', 'Andrew Sherley',
    'name_type', 'full_name',
    'reasoning', 'Manually tagged by administrator'
  )
)
ON CONFLICT (recording_id, employee_id) DO NOTHING
RETURNING *;
```

#### Option C: Use the Employee Profile UI

If you have a UI for manual employee assignment:

1. Go to the recording detail page
2. Look for an "Assign Employee" or "Link Employee" button
3. Select "Andrew Sherley" from the dropdown
4. Save the assignment

### Step 4: Verify the Fix

After linking, verify it worked:

1. **Go to Andrew Sherley's employee profile**: `/employees/[ANDREW_UUID]`
2. **Click the "Recordings" tab**
3. **You should see the recording listed!**

If you still don't see it:

```sql
-- Verify the participation record exists
SELECT
  ecp.*,
  e.first_name,
  e.last_name,
  r.title as recording_title
FROM employee_call_participation ecp
JOIN employees e ON e.id = ecp.employee_id
JOIN recordings r ON r.id = ecp.recording_id
WHERE r.id = 'b983a9f3-ca13-4ba1-a877-d35489dda124'
  OR e.first_name ILIKE '%Andrew%';
```

## Common Issues & Troubleshooting

### "Recording still not showing on profile"

**Check 1**: Verify employee ID in URL matches database
```sql
SELECT id, first_name, last_name FROM employees
WHERE first_name = 'Andrew' AND last_name = 'Sherley';
```

Make sure the URL `/employees/[UUID]` uses the correct UUID.

**Check 2**: Clear browser cache and refresh the page

**Check 3**: Check browser console for errors (F12 → Console)

**Check 4**: Verify RLS policies allow reading participation records
```sql
-- Check if employee_call_participation has proper RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'employee_call_participation';
```

### "Employee detection says no name found"

This means:
- The transcript doesn't clearly mention "Andrew Sherley" or "Andrew"
- The name is misspelled or in an unusual format
- The AI couldn't confidently detect the name

**Solution**: Use manual linking (Option B above) instead of automatic detection.

### "Duplicate participation records"

If you see multiple participation records for the same recording:

```sql
-- Remove duplicate participation records
DELETE FROM employee_call_participation
WHERE id NOT IN (
  SELECT MIN(id)
  FROM employee_call_participation
  GROUP BY recording_id, employee_id
);
```

### "Name spelling variations"

If the transcript says "Andrew Shirley" (with an 'i') but the database has "Andrew Sherley" (with an 'e'):

**Option 1**: Update the employee record to match the transcript
```sql
UPDATE employees
SET last_name = 'Shirley'  -- or whatever variation is in transcript
WHERE first_name = 'Andrew' AND last_name = 'Sherley';
```

**Option 2**: The fuzzy matching should handle 1-character differences, so try re-running detection

## Prevention: Avoid This Issue in the Future

1. **Always add employees to the database first** before uploading their recordings

2. **Use consistent name spelling** across transcripts and employee records

3. **Run employee detection immediately** after transcription completes

4. **Set up a database trigger** to auto-detect employees:
   ```sql
   -- Auto-trigger employee detection after transcription
   CREATE OR REPLACE FUNCTION auto_detect_employee()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.status = 'transcribed' OR NEW.status = 'completed' THEN
       IF NEW.transcript IS NOT NULL AND LENGTH(NEW.transcript) > 100 THEN
         -- Call Edge Function asynchronously
         PERFORM net.http_post(
           url := 'https://YOUR_PROJECT.supabase.co/functions/v1/extract-employee-name',
           headers := '{"Content-Type": "application/json"}'::jsonb,
           body := json_build_object('recording_id', NEW.id)::jsonb
         );
       END IF;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trigger_auto_detect_employee
   AFTER UPDATE OF status ON recordings
   FOR EACH ROW
   EXECUTE FUNCTION auto_detect_employee();
   ```

## Quick Reference

**Recording ID**: `b983a9f3-ca13-4ba1-a877-d35489dda124`

**Actions Required**:
1. ✅ Add Andrew Sherley to `employees` table
2. ✅ Verify recording exists and has transcript
3. ✅ Link recording to Andrew (automatic or manual)
4. ✅ Verify on employee profile page

**SQL Quick Commands**:
```sql
-- 1. Add employee
INSERT INTO employees (first_name, last_name, email, status)
VALUES ('Andrew', 'Sherley', 'asherley@ecisolutions.com', 'active')
RETURNING id;

-- 2. Check recording
SELECT id, title, employee_name, LENGTH(transcript) as transcript_len
FROM recordings
WHERE id = 'b983a9f3-ca13-4ba1-a877-d35489dda124';

-- 3. Manual link (replace ANDREW_UUID)
INSERT INTO employee_call_participation (recording_id, employee_id, participation_type, confidence_score, manually_tagged)
VALUES ('b983a9f3-ca13-4ba1-a877-d35489dda124', 'ANDREW_UUID', 'primary', 1.0, true);

-- 4. Verify
SELECT * FROM employee_call_participation
WHERE recording_id = 'b983a9f3-ca13-4ba1-a877-d35489dda124';
```

---

**Need Help?** Check the browser console (F12) for detailed error messages, or run the diagnostic script again after adding Andrew to the employees table.
