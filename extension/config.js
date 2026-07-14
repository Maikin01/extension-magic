// Configuração da extensão Lovable.
// IMPORTANTE: quando publicar o site, garanta que API_BASE_URL aponta para
// a URL de produção estável. Estas URLs são fixas e não mudam se o projeto
// for renomeado no Lovable.

export const CONFIG = {
  // URL de produção (usada quando o site está publicado):
  API_BASE_URL: "https://project--2566d124-3802-48ac-bdb7-78e7db243db8.lovable.app",
  // URL de preview (build de desenvolvimento no Lovable):
  API_BASE_URL_DEV: "https://project--2566d124-3802-48ac-bdb7-78e7db243db8-dev.lovable.app",
  // Intervalo entre validações periódicas (em minutos).
  REVALIDATE_MINUTES: 60,
  // Se a extensão ficar offline, tolera N horas antes de bloquear.
  OFFLINE_TOLERANCE_HOURS: 24,
};
