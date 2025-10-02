# Database Migration Guide for Manager Feedback System

## 🎯 **Overview**

This guide walks you through applying the database migrations for the manager feedback system in development before pushing to production.

## 📋 **Migration Files**

The following migration files need to be applied:

1. **`20250120000001_create_manager_feedback_corrections.sql`**
   - Creates the main feedback corrections table
   - Sets up RLS policies for security
   - Adds indexes for performance

2. **`20250120000002_create_constraint_system_tables.sql`**
   - Creates AI calibration constraint tables
   - Sets up real-time constraint updates
   - Adds validation workflow tables

## 🚀 **Migration Options**

### **Option 1: Supabase Dashboard (Recommended for Development)**

This is the safest and most visual approach:

#### **Step 1: Access Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New Query"**

#### **Step 2: Apply First Migration**
1. Copy the contents of `supabase/migrations/20250120000001_create_manager_feedback_corrections.sql`
2. Paste into the SQL Editor
3. Click **"Run"** to execute
4. Verify the table was created successfully

#### **Step 3: Apply Second Migration**
1. Copy the contents of `supabase/migrations/20250120000002_create_constraint_system_tables.sql`
2. Paste into the SQL Editor
3. Click **"Run"** to execute
4. Verify all tables were created

#### **Step 4: Verify Migration Success**
Run this query to check all tables exist:
```sql
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

### **Option 2: Supabase CLI (Advanced)**

If you want to use the CLI for more control:

#### **Step 1: Initialize Supabase (if not already done)**
```bash
npx supabase init
```

#### **Step 2: Link to Your Project**
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

#### **Step 3: Apply Migrations**
```bash
npx supabase db push
```

### **Option 3: Direct SQL Execution**

If you prefer to run SQL directly:

#### **Step 1: Connect to Your Database**
Use your preferred PostgreSQL client (pgAdmin, DBeaver, etc.)

#### **Step 2: Execute Migration Files**
Run each migration file in order:
1. `20250120000001_create_manager_feedback_corrections.sql`
2. `20250120000002_create_constraint_system_tables.sql`

## 🧪 **Testing the Migrations**

### **Step 1: Verify Tables Exist**
```sql
-- Check if all tables were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%feedback%' OR table_name LIKE '%constraint%' OR table_name LIKE '%validation%';
```

### **Step 2: Test RLS Policies**
```sql
-- Test that RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('manager_feedback_corrections', 'ai_calibration_constraints');
```

### **Step 3: Test Insert Permissions**
```sql
-- Test inserting a sample record (replace with your user ID)
INSERT INTO manager_feedback_corrections (
  evaluation_id,
  manager_id,
  recording_id,
  original_ai_scores,
  original_overall_score,
  corrected_scores,
  corrected_overall_score,
  criteria_adjustments,
  change_reason,
  manager_notes,
  confidence_level,
  score_variance,
  high_variance
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with actual evaluation ID
  '00000000-0000-0000-0000-000000000000', -- Replace with your user ID
  '00000000-0000-0000-0000-000000000000', -- Replace with actual recording ID
  '{"opening": {"score": 3.0}, "objection_handling": {"score": 2.5}}',
  2.75,
  '{"opening": {"score": 3.5}, "objection_handling": {"score": 3.0}}',
  3.25,
  '{"opening": {"score": 3.5, "original": 3.0}, "objection_handling": {"score": 3.0, "original": 2.5}}',
  'too_lenient',
  'Test feedback submission',
  4,
  0.5,
  false
);
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. Permission Denied**
```sql
-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

#### **2. RLS Policy Issues**
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'manager_feedback_corrections';
```

#### **3. Foreign Key Constraint Errors**
Make sure the referenced tables exist:
- `bdr_scorecard_evaluations`
- `profiles`
- `recordings`

### **Rollback Plan**

If you need to rollback the migrations:

```sql
-- Drop tables in reverse order
DROP TABLE IF EXISTS ai_calibration_logs CASCADE;
DROP TABLE IF EXISTS validation_alerts CASCADE;
DROP TABLE IF EXISTS validation_queue CASCADE;
DROP TABLE IF EXISTS constraint_updates CASCADE;
DROP TABLE IF EXISTS ai_calibration_constraints CASCADE;
DROP TABLE IF EXISTS manager_feedback_corrections CASCADE;
```

## ✅ **Verification Checklist**

After applying migrations, verify:

- [ ] All 6 tables created successfully
- [ ] RLS policies are active
- [ ] Foreign key constraints are working
- [ ] Indexes are created for performance
- [ ] Can insert test data
- [ ] Can query data with proper permissions
- [ ] Real-time subscriptions work (if using Supabase)

## 🚀 **Next Steps After Migration**

1. **Update your application** to use the new tables
2. **Test the feedback system** with real data
3. **Monitor performance** and adjust indexes if needed
4. **Set up monitoring** for the new tables
5. **Document the changes** for your team

## 📞 **Support**

If you encounter issues:

1. Check the Supabase logs in your dashboard
2. Verify your database connection
3. Ensure all required tables exist
4. Check RLS policies are correctly configured

The migrations are designed to be safe and can be run multiple times without issues (using `CREATE TABLE IF NOT EXISTS`).
