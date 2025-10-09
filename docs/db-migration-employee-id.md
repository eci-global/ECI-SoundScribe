Goal
Make `employees.employee_id` always mirror the UUID primary key (`employees.id`), and preserve your human-readable employee code in `employees.employee_code`.

Summary
- Keep UUID `employees.id` as the canonical PK.
- Add `employees.employee_code` to store the legacy/human code (e.g., 140541).
- Make `employees.employee_id` a generated column: `id::text`.
- Backfill child tables to reference employees by UUID (or `id::text`).
- Edge Function import now writes `employee_code` from CSV `employee_id`.

How to run
1) Open Supabase Studio → SQL Editor.
2) Paste and run: `supabase/migrations/2025-10-09-employee-id-mirror-uuid.sql`.
   - This will:
     - Add `employee_code` (if missing) and backfill from current `employee_id`.
     - Replace `employee_id` with a generated column mirroring `id::text`.
     - Backfill child tables (`employee_scorecards`, `employee_call_participation`, `manager_coaching_notes`) to reference UUIDs.

3) Verify
   - New/updated employees show `employee_id = id::text`.
   - Legacy human code preserved in `employee_code`.
   - Child tables reference the UUID (or `id::text`).

Edge Function Import
- Already updated: `supabase/functions/upload-employees/index.ts` now maps incoming CSV `employee_id` → `employee_code`.
- If `employee_id` is a generated column, Postgres will ignore any client-provided value and use `id::text`.

After migration
- The app can rely solely on UUID for joins.
- Once you confirm data is clean, we can remove dual-ID fallbacks from the service layer.

Rollback (manual)
- If needed, you can drop the generated column and recreate `employee_id` as a plain text column, but this is not recommended.

