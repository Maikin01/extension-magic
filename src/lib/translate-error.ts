// Traduz mensagens de erro comuns (Supabase Auth, Mercado Pago, rede) para pt-BR.
// Se não houver tradução direta, tenta uma normalização amigável.

const DICTIONARY: Array<[RegExp, string]> = [
  // ---- Supabase Auth ----
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/invalid email or password/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "E-mail ainda não confirmado. Verifique sua caixa de entrada."],
  [/email link is invalid or has expired/i, "O link do e-mail é inválido ou expirou."],
  [/token has expired or is invalid/i, "O link expirou ou é inválido. Solicite um novo."],
  [/user already registered/i, "Este e-mail já está cadastrado."],
  [/user already exists/i, "Este e-mail já está cadastrado."],
  [/a user with this email address has already been registered/i, "Este e-mail já está cadastrado."],
  [/duplicate key value/i, "Registro duplicado."],
  [/password should be at least (\d+) characters?/i, "A senha precisa ter no mínimo $1 caracteres."],
  [/password is too short/i, "Senha muito curta."],
  [/weak password/i, "Senha fraca. Use letras, números e símbolos."],
  [/unable to validate email address/i, "Não foi possível validar este e-mail."],
  [/invalid email/i, "E-mail inválido."],
  [/email rate limit exceeded/i, "Muitos e-mails enviados. Aguarde alguns minutos e tente novamente."],
  [/rate limit/i, "Muitas tentativas. Aguarde alguns instantes e tente novamente."],
  [/for security purposes.*?(\d+) seconds?/i, "Por segurança, aguarde $1 segundos antes de tentar novamente."],
  [/signups? (are )?not allowed|disabled/i, "Cadastros estão temporariamente desativados."],
  [/user not found/i, "Usuário não encontrado."],
  [/no user found/i, "Usuário não encontrado."],
  [/session (missing|expired|not found)/i, "Sessão expirada. Faça login novamente."],
  [/jwt.*expired/i, "Sessão expirada. Faça login novamente."],
  [/refresh token/i, "Sessão expirada. Faça login novamente."],
  [/not authenticated|unauthorized/i, "Você precisa estar logado."],
  [/forbidden|permission denied/i, "Você não tem permissão para esta ação."],
  [/unsupported provider/i, "Provedor de login não configurado."],
  [/otp.*(expired|invalid)/i, "Código inválido ou expirado."],
  [/captcha/i, "Falha na verificação anti-robô. Tente novamente."],
  [/network (error|request failed)/i, "Falha de conexão. Verifique sua internet."],
  [/failed to fetch/i, "Falha de conexão. Verifique sua internet."],
  [/timeout|timed out/i, "Tempo esgotado. Tente novamente."],
  [/aborted/i, "Requisição cancelada."],
  [/internal server error/i, "Erro interno do servidor. Tente novamente em instantes."],
  [/service unavailable/i, "Serviço indisponível no momento."],
  [/bad request/i, "Requisição inválida."],
  [/not found/i, "Não encontrado."],

  // ---- Mercado Pago / Pix ----
  [/rejected[_ ]high[_ ]risk/i, "Pagamento recusado por risco. Tente outro método."],
  [/cc_rejected/i, "Pagamento recusado pela operadora."],
  [/insufficient[_ ]amount|funds/i, "Saldo insuficiente."],
  [/invalid[_ ]cpf|cpf.*invalid/i, "CPF inválido."],
];

export function translateError(input: unknown): string {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof Error
        ? input.message
        : typeof (input as { message?: unknown })?.message === "string"
          ? ((input as { message: string }).message)
          : "";
  const msg = (raw || "").trim();
  if (!msg) return "Algo deu errado. Tente novamente.";

  for (const [re, pt] of DICTIONARY) {
    const m = msg.match(re);
    if (m) return pt.replace(/\$(\d+)/g, (_, i) => m[Number(i)] ?? "");
  }
  // Se já parece estar em português (tem acento ou palavras comuns), devolve como está.
  if (/[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]|(\b(erro|falha|inválid|senha|conta|não|licen|plano|pagamento|usuário|cadastr)\b)/i.test(msg)) {
    return msg;
  }
  return msg; // fallback: mostra o original
}
