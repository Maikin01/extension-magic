CREATE OR REPLACE FUNCTION public.apply_payment_status(p_payment_id uuid, p_provider_payment_id text, p_status text, p_raw jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_effective_status text;
  -- estados terminais reais (estorno/chargeback) — só estes bloqueiam reaprovação
  v_final constant text[] := ARRAY['refunded', 'charged_back'];
  -- cancelado/rejeitado NÃO é definitivo: o Pix pode ser pago e o MP enviar
  -- um evento de expiração/cancelamento fora de ordem.
  v_soft_terminal constant text[] := ARRAY['cancelled', 'rejected'];
  v_preapproval constant text[] := ARRAY['pending', 'authorized', 'in_process', 'in_mediation', 'rejected'];
BEGIN
  IF p_status <> ALL (v_final)
     AND p_status <> ALL (v_soft_terminal)
     AND p_status <> 'approved'
     AND p_status <> ALL (v_preapproval) THEN
    RAISE EXCEPTION 'unsupported payment status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'payment not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_payment.provider_payment_id IS NOT NULL
     AND v_payment.provider_payment_id <> p_provider_payment_id THEN
    RAISE EXCEPTION 'provider payment mismatch' USING ERRCODE = '22023';
  END IF;

  v_effective_status := p_status;

  -- Estorno/chargeback são definitivos.
  IF v_payment.status = ANY (v_final) THEN
    v_effective_status := v_payment.status;
  -- Já aprovado não volta para estados anteriores nem para cancelado/rejeitado.
  ELSIF v_payment.status = 'approved'
        AND (p_status = ANY (v_preapproval) OR p_status = ANY (v_soft_terminal)) THEN
    v_effective_status := v_payment.status;
  END IF;
  -- Qualquer outro caso: o status vindo do provedor prevalece, inclusive
  -- 'approved' sobre um 'cancelled'/'rejected' anterior.

  UPDATE public.payments
  SET
    status = v_effective_status,
    provider_payment_id = p_provider_payment_id,
    raw = CASE WHEN v_effective_status = p_status THEN p_raw ELSE raw END,
    paid_at = CASE WHEN v_effective_status = 'approved' THEN coalesce(paid_at, now()) ELSE paid_at END
  WHERE id = p_payment_id;

  IF v_effective_status = ANY (v_final) AND v_payment.license_id IS NOT NULL THEN
    UPDATE public.licenses
    SET status = 'revoked'
    WHERE id = v_payment.license_id AND status <> 'revoked';
  END IF;

  -- Reaprovação: reativa licença que tenha sido revogada por cancelamento indevido.
  IF v_effective_status = 'approved' AND v_payment.license_id IS NOT NULL THEN
    UPDATE public.licenses
    SET status = 'pending'
    WHERE id = v_payment.license_id
      AND status = 'revoked'
      AND activated_at IS NULL;
  END IF;

  RETURN v_effective_status;
END;
$function$;