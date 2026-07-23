
-- 1) Audit log table
CREATE TABLE public.rls_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'policy_change' | 'denied_read' | 'anon_access'
  table_name TEXT,
  policy_name TEXT,
  command_tag TEXT,
  actor_role TEXT,
  actor_user_id UUID,
  request_path TEXT,
  request_ip TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rls_audit_log_created_at ON public.rls_audit_log (created_at DESC);
CREATE INDEX idx_rls_audit_log_event_type ON public.rls_audit_log (event_type);
CREATE INDEX idx_rls_audit_log_table_name ON public.rls_audit_log (table_name);

GRANT SELECT ON public.rls_audit_log TO authenticated;
GRANT ALL ON public.rls_audit_log TO service_role;

ALTER TABLE public.rls_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.rls_audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Service role bypasses RLS but keep explicit policy for clarity
CREATE POLICY "Service role manages audit log"
  ON public.rls_audit_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 2) Event trigger for policy DDL
CREATE OR REPLACE FUNCTION public.log_policy_ddl()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF r.command_tag IN ('CREATE POLICY', 'ALTER POLICY', 'DROP POLICY') THEN
      INSERT INTO public.rls_audit_log (event_type, table_name, command_tag, actor_role, details)
      VALUES (
        'policy_change',
        r.object_identity,
        r.command_tag,
        current_user,
        jsonb_build_object(
          'schema', r.schema_name,
          'object_type', r.object_type,
          'object_identity', r.object_identity
        )
      );
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS trg_log_policy_ddl;
CREATE EVENT TRIGGER trg_log_policy_ddl
  ON ddl_command_end
  WHEN TAG IN ('CREATE POLICY', 'ALTER POLICY', 'DROP POLICY')
  EXECUTE FUNCTION public.log_policy_ddl();

-- Also capture DROP POLICY via sql_drop (ddl_command_end doesn't always fire for DROP)
CREATE OR REPLACE FUNCTION public.log_policy_drop()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF r.object_type = 'policy' THEN
      INSERT INTO public.rls_audit_log (event_type, table_name, policy_name, command_tag, actor_role, details)
      VALUES (
        'policy_change',
        r.object_identity,
        r.object_name,
        'DROP POLICY',
        current_user,
        jsonb_build_object('schema', r.schema_name, 'object_identity', r.object_identity)
      );
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS trg_log_policy_drop;
CREATE EVENT TRIGGER trg_log_policy_drop
  ON sql_drop
  EXECUTE FUNCTION public.log_policy_drop();
