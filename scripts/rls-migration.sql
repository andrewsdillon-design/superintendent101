-- ============================================================
-- ProFieldHub — Row Level Security for DailyLog
-- Run this once in the Neon console SQL editor
-- ============================================================

-- 1. Enable RLS on DailyLog.
--    FORCE means even the table owner (neondb_owner) is subject
--    to policies — no accidental cross-user reads possible at
--    the DB level even if app code has a bug.
ALTER TABLE "DailyLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyLog" FORCE ROW LEVEL SECURITY;

-- 2. The main isolation policy.
--    Every query must set:  SET LOCAL "app.current_user_id" = '<userId>';
--    before operating on DailyLog. The app does this inside a
--    $transaction via prisma.$executeRaw (see src/lib/rls.ts).
CREATE POLICY "isolate_by_user" ON "DailyLog"
  USING (
    "userId" = NULLIF(current_setting('app.current_user_id', true), '')
  );

-- 3. Superuser bypass policy — allows admin tooling / migrations
--    to still operate when the session var is not set.
--    Remove this once you have a dedicated app role.
CREATE POLICY "admin_bypass" ON "DailyLog"
  USING (
    NULLIF(current_setting('app.current_user_id', true), '') IS NULL
    AND current_user = 'neondb_owner'  -- adjust to your Neon role name
  );

-- ============================================================
-- To verify policies are active:
--   SELECT tablename, rowsecurity, forcerowsecurity
--   FROM pg_tables
--   WHERE tablename = 'DailyLog';
--
-- To list policies:
--   SELECT * FROM pg_policies WHERE tablename = 'DailyLog';
-- ============================================================
