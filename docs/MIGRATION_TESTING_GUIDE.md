# Migration Testing Guide

## 🎯 **Step-by-Step Migration Testing**

### **Step 1: Apply the Migrations**

You have **3 options** to apply the migrations:

#### **Option A: Supabase Dashboard (Recommended)**
1. **Go to**: https://supabase.com/dashboard/project/qinkldgvejheppheykfl
2. **Navigate to**: SQL Editor (left sidebar)
3. **Copy and paste** the content from each migration file:
   - First: `supabase/migrations/20250120000001_create_manager_feedback_corrections.sql`
   - Second: `supabase/migrations/20250120000002_create_constraint_system_tables.sql`
4. **Click "Run"** for each migration

#### **Option B: Use the Helper Script**
```bash
# Display migration content and instructions
node apply-migrations.js
```

#### **Option C: Supabase CLI**
```bash
# Apply migrations via CLI
npx supabase db push
```

### **Step 2: Test the Migrations**

#### **Method 1: Automated Test (Recommended)**
```bash
# Run the automated test
node test-migrations.js
```

#### **Method 2: Manual Verification**
Go to your Supabase SQL Editor and run:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'manager_feedback_corrections',
  'ai_calibration_constraints',
  'constraint_updates',
  'validation_queue',
  'validation_alerts',
  'ai_calibration_logs'
);
```

### **Step 3: Test the Feedback System**

1. **Go to**: http://localhost:8080/feedback-test
2. **Test the manager feedback modal**
3. **Check the analytics dashboard**: http://localhost:8080/admin/feedback-analytics
4. **Verify data is being stored** (check browser console for demo mode logs)

## 🚀 **Quick Start Commands**

```bash
# 1. Apply migrations (choose one method)
node apply-migrations.js  # Shows migration content
# OR go to Supabase Dashboard → SQL Editor

# 2. Test migrations
node test-migrations.js

# 3. Test the system
# Go to http://localhost:8080/feedback-test
```

## 🔧 **Your Supabase Configuration**

- **Project URL**: https://qinkldgvejheppheykfl.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/qinkldgvejheppheykfl
- **SQL Editor**: https://supabase.com/dashboard/project/qinkldgvejheppheykfl/sql

## ✅ **Success Indicators**

After applying migrations, you should see:

1. **6 new tables** in your database
2. **RLS policies** are active
3. **Indexes** are created for performance
4. **Feedback system** works in demo mode
5. **Analytics dashboard** shows mock data

## 🆘 **Troubleshooting**

### **If migrations fail:**
1. Check your Supabase project is accessible
2. Verify you have the correct permissions
3. Check the Supabase logs for errors

### **If test fails:**
1. Ensure migrations were applied successfully
2. Check your internet connection
3. Verify Supabase credentials are correct

### **If feedback system doesn't work:**
1. Check browser console for errors
2. Ensure development server is running
3. Verify all components are properly imported

## 📞 **Need Help?**

1. **Check the logs** in your Supabase dashboard
2. **Run the verification queries** manually
3. **Test with demo mode** first before real data
4. **Check browser console** for any JavaScript errors

The system is designed to work in demo mode even without the database tables, so you can test the UI and functionality before applying migrations.
