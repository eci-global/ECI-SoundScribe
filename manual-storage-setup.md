# Manual Supabase Storage Setup

Since you don't have owner privileges to run SQL commands on storage tables, let's fix this through the Supabase Dashboard UI:

## 🎯 Method 1: Dashboard Storage Configuration

### Step 1: Check Storage Bucket
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/qinkldgvejheppheykfl
2. Click **"Storage"** in the left sidebar
3. Look for a bucket called **"recordings"**

### Step 2A: If "recordings" bucket EXISTS
1. Click on the **"recordings"** bucket
2. Click the **"Settings"** tab (or gear icon)
3. Make sure these settings are configured:
   - ✅ **Public bucket**: ON/Enabled
   - ✅ **File size limit**: 100MB (104857600 bytes)
   - ✅ **Allowed MIME types**: Add these:
     - `audio/mpeg`
     - `audio/wav` 
     - `audio/ogg`
     - `audio/webm`
     - `video/mp4`
     - `video/webm`
     - `video/quicktime`

### Step 2B: If "recordings" bucket DOESN'T EXIST
1. Click **"New bucket"**
2. **Bucket name**: `recordings`
3. ✅ **Public bucket**: Enabled
4. **File size limit**: 100MB
5. **Allowed MIME types**: Add the list above
6. Click **"Create bucket"**

### Step 3: Configure RLS Policies
1. Go to **"Authentication"** > **"Policies"** 
2. Look for **"storage"** schema policies
3. Or try going to **"Storage"** > **"Policies"** if that option exists

## 🎯 Method 2: Alternative Test

Let's also add a simple test to see if the current setup works: