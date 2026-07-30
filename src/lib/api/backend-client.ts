import { supabase } from "@/integrations/supabase/client";
import { getSupabasePublicConfig } from "@/integrations/supabase/public-config";

const DEFAULT_TIMEOUT_MS = 15_000;

export type FieldIssue = { field: string; message: string };

type ErrorPayload = {
  code?: unknown;
  message?: unknown;
  requestId?: unknown;
  fields?: unknown;
};

export class BackendApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string;
  readonly fields: FieldIssue[];

  constructor(options: {
    message: string;
    code?: string;
    status?: number;
    requestId: string;
    fields?: FieldIssue[];
  }) {
    super(options.message);
    this.name = "BackendApiError";
    this.code = options.code ?? "BACKEND_ERROR";
    this.status = options.status ?? 500;
    this.requestId = options.requestId;
    this.fields = options.fields ?? [];
  }
}

function createRequestId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function normalizeErrorPayload(payload: unknown): ErrorPayload {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  const nested = record.error;
  if (nested && typeof nested === "object") return nested as ErrorPayload;
  if (typeof nested === "string") {
    return {
      code: record.code,
      message: nested,
      requestId: record.requestId,
      fields: record.fields,
    };
  }
  return record as ErrorPayload;
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function request<T>(options: {
  functionName: "backend-api" | "public-api";
  action: string;
  data?: unknown;
  authenticated: boolean;
  retryAfterRefresh?: boolean;
  timeoutMs?: number;
}): Promise<T> {
  const requestId = createRequestId();
  const { url, publishableKey } = getSupabasePublicConfig();
  let accessToken: string | undefined;

  if (options.authenticated) {
    const { data } = await supabase.auth.getSession();
    accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new BackendApiError({
        message: "Sessão ausente ou expirada.",
        code: "UNAUTHENTICATED",
        status: 401,
        requestId,
      });
    }
  }

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const headers = new Headers({
      "Content-Type": "application/json",
      apikey: publishableKey,
      "X-Request-Id": requestId,
    });
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${url}/functions/v1/${options.functionName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: options.action, data: options.data }),
      signal: controller.signal,
    });

    if (response.status === 401 && options.authenticated && options.retryAfterRefresh !== false) {
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        return request<T>({ ...options, retryAfterRefresh: false });
      }
    }

    const payload = await readPayload(response);
    if (!response.ok) {
      const details = normalizeErrorPayload(payload);
      throw new BackendApiError({
        message:
          typeof details.message === "string"
            ? details.message
            : `O backend respondeu com HTTP ${response.status}.`,
        code: typeof details.code === "string" ? details.code : `HTTP_${response.status}`,
        status: response.status,
        requestId:
          typeof details.requestId === "string"
            ? details.requestId
            : response.headers.get("x-request-id") || requestId,
      });
    }

    return payload as T;
  } catch (error) {
    if (error instanceof BackendApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new BackendApiError({
        message: "O backend demorou demais para responder.",
        code: "TIMEOUT",
        status: 408,
        requestId,
      });
    }
    throw new BackendApiError({
      message: error instanceof Error ? error.message : "Falha de conexão com o backend.",
      code: "NETWORK_ERROR",
      status: 0,
      requestId,
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export const backendApi = {
  invoke<T>(action: string, data?: unknown, options?: { timeoutMs?: number }): Promise<T> {
    return request<T>({
      functionName: "backend-api",
      action,
      data,
      authenticated: true,
      timeoutMs: options?.timeoutMs,
    });
  },

  public<T>(action: string, data?: unknown): Promise<T> {
    return request<T>({
      functionName: "public-api",
      action,
      data,
      authenticated: false,
      retryAfterRefresh: false,
    });
  },
};
