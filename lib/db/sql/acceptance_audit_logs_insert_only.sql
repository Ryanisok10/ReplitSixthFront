-- Enforce INSERT-only (append-only, immutable) semantics on acceptance_audit_logs.
--
-- drizzle-kit push creates the table but does NOT manage triggers or privileges,
-- so this script must be applied once after the schema is pushed:
--
--   psql "$DATABASE_URL" -f lib/db/sql/acceptance_audit_logs_insert_only.sql
--
-- After this runs, any UPDATE or DELETE against acceptance_audit_logs raises an
-- exception at the database level, guaranteeing the audit log is tamper-evident
-- regardless of application code paths. The script is idempotent.

CREATE OR REPLACE FUNCTION acceptance_audit_logs_block_mutation()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'acceptance_audit_logs is append-only; % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_acceptance_audit_logs_no_update ON acceptance_audit_logs;
DROP TRIGGER IF EXISTS trg_acceptance_audit_logs_no_delete ON acceptance_audit_logs;

CREATE TRIGGER trg_acceptance_audit_logs_no_update
  BEFORE UPDATE ON acceptance_audit_logs
  FOR EACH ROW EXECUTE FUNCTION acceptance_audit_logs_block_mutation();

CREATE TRIGGER trg_acceptance_audit_logs_no_delete
  BEFORE DELETE ON acceptance_audit_logs
  FOR EACH ROW EXECUTE FUNCTION acceptance_audit_logs_block_mutation();

-- Optional additional hardening (uncomment and set the application role name to
-- revoke UPDATE/DELETE privileges entirely for the app's database role):
-- REVOKE UPDATE, DELETE ON acceptance_audit_logs FROM CURRENT_USER;
