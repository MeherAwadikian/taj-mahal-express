-- =============================================================================
-- RLS Verification Script — Taj Mahal Express
-- Run against your Supabase project to confirm all tables have RLS enabled.
-- Usage: psql "$DATABASE_URL" -f scripts/verify-rls.sql
-- =============================================================================

\echo '=== Tables with RLS disabled (should be empty) ==='
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT relname
    FROM pg_class
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
    WHERE relrowsecurity = true
      AND nspname = 'public'
  )
ORDER BY tablename;

\echo ''
\echo '=== Tables with RLS enabled ==='
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  COUNT(p.polname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

\echo ''
\echo '=== Tables with RLS enabled but NO policies (dangerous!) ==='
SELECT
  c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
  )
ORDER BY c.relname;

\echo ''
\echo '=== All policies ==='
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''
\echo '=== Helper functions ==='
SELECT
  proname AS function_name,
  prosecdef AS security_definer,
  pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
WHERE nspname = 'public'
  AND proname IN ('is_admin', 'get_seller_profile_id', 'trigger_set_updated_at')
ORDER BY proname;

\echo ''
\echo '=== Auth trigger ==='
SELECT
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
ORDER BY trigger_name;
