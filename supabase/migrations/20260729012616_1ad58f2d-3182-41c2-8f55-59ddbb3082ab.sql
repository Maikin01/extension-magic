CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  scope text NOT NULL,
  key_hash text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key_hash)
);

GRANT ALL ON public.edge_rate_limits TO service_role;
ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_edge_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (allowed boolean, remaining integer, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started timestamptz;
  v_count integer;
BEGIN
  INSERT INTO public.edge_rate_limits (scope, key_hash, window_started_at, request_count, updated_at)
  VALUES (p_scope, p_key_hash, now(), 1, now())
  ON CONFLICT (scope, key_hash) DO UPDATE
    SET request_count = CASE
          WHEN public.edge_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) THEN 1
          ELSE public.edge_rate_limits.request_count + 1
        END,
        window_started_at = CASE
          WHEN public.edge_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds) THEN now()
          ELSE public.edge_rate_limits.window_started_at
        END,
        updated_at = now()
  RETURNING window_started_at, request_count INTO v_started, v_count;

  allowed := v_count <= p_limit;
  remaining := GREATEST(0, p_limit - v_count);
  retry_after_seconds := CASE
    WHEN allowed THEN 0
    ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_started + make_interval(secs => p_window_seconds)) - now()))::int)
  END;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_edge_rate_limit(text, text, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_edge_rate_limit(text, text, integer, integer) TO service_role;