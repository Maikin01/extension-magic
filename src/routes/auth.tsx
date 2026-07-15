import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Rise Lovable" },
      { name: "description", content: "Entre ou crie sua conta na Rise Lovable." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Email inválido").max(255);
const passwordSchema = z.string().min(6, "Mínimo de 6 caracteres").max(72);
const PENDING_CHECKOUT_KEY = "rise_lovable_pending_checkout";
type AuthTab = "login" | "signup";
type AuthParams = { next: string; plan: string | null; initialTab: AuthTab };

const defaultAuthParams: AuthParams = {
  next: "/dashboard",
  plan: null,
  initialTab: "login",
};

function savePendingCheckout(planSlug: string) {
  window.localStorage.setItem(PENDING_CHECKOUT_KEY, planSlug);
  window.sessionStorage.setItem(PENDING_CHECKOUT_KEY, planSlug);
}

function getAuthParams(): AuthParams {
  if (typeof window === "undefined") {
    return defaultAuthParams;
  }
  const params = new URLSearchParams(window.location.search);
  const claim = params.get("claim");
  const plan = params.get("plan");
  const next = params.get("next") ?? (plan ? `/?checkout=${plan}#plans` : claim === "trial" ? "/dashboard?claim=trial" : "/dashboard");
  const initialTab: AuthTab = params.get("tab") === "signup" || plan ? "signup" : "login";
  return { next, plan, initialTab };
}

function sanitizeNextPath(value: string) {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith("/") && !decoded.startsWith("//") ? decoded : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function getAuthHashParams() {
  const rawHash = window.location.hash.replace(/^#/, "");
  const authParamStart = rawHash.search(/(?:^|[#&?])(access_token|refresh_token|token_hash|type)=/);
  const paramsSource = authParamStart >= 0 ? rawHash.slice(authParamStart).replace(/^[#&?]/, "") : rawHash;
  return new URLSearchParams(paramsSource);
}

function readAuthUrlParams() {
  const url = new URL(window.location.href);
  const hash = getAuthHashParams();
  const tokenHash = url.searchParams.get("token_hash") ?? hash.get("token_hash");
  const type = url.searchParams.get("type") ?? hash.get("type") ?? "signup";
  return {
    code: url.searchParams.get("code"),
    tokenHash,
    type,
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
    hasCallback:
      url.searchParams.has("code") ||
      url.searchParams.has("token_hash") ||
      window.location.hash.includes("access_token=") ||
      window.location.hash.includes("refresh_token=") ||
      hash.has("access_token") ||
      hash.has("refresh_token"),
  };
}

async function finishEmailConfirmationFromUrl() {
  const authUrl = readAuthUrlParams();

  if (authUrl.tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: authUrl.tokenHash,
      type: authUrl.type as any,
    });
    if (error) console.warn("[auth] Falha ao confirmar token do email", error);
  }

  if (authUrl.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(authUrl.code);
    if (error) console.warn("[auth] Falha ao concluir confirmação por código", error);
  }

  if (authUrl.accessToken && authUrl.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: authUrl.accessToken,
      refresh_token: authUrl.refreshToken,
    });
    if (error) console.warn("[auth] Falha ao restaurar sessão da confirmação", error);
  }
}

async function waitForVerifiedUser(attempts: number) {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return data.user;
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  return null;
}

function AuthPage() {
  const navigate = useNavigate();
  const [authParams, setAuthParams] = useState<AuthParams>(defaultAuthParams);
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const currentParams = getAuthParams();
    setAuthParams(currentParams);
    setActiveTab(currentParams.initialTab);
    if (currentParams.plan) {
      savePendingCheckout(currentParams.plan);
    }

    const next = currentParams.next;
    const dest = sanitizeNextPath(next);

    let cancelled = false;
    let redirected = false;
    const go = () => {
      if (redirected || cancelled) return;
      redirected = true;
      if (dest.includes("checkout=")) {
        window.location.replace(dest);
      } else if (dest.startsWith("/")) {
        navigate({ to: dest, replace: true } as any);
      } else {
        navigate({ to: "/dashboard", replace: true });
      }
    };

    const finishChecking = () => {
      if (!cancelled) setCheckingSession(false);
    };

    const authUrl = readAuthUrlParams();

    const run = async () => {
      if (cancelled) return;
      if (authUrl.hasCallback) {
        await finishEmailConfirmationFromUrl();
      }
      const user = await waitForVerifiedUser(authUrl.hasCallback ? 24 : 1);
      if (user) {
        go();
        return;
      }
      finishChecking();
    };

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        go();
        return;
      }
      if (event === "INITIAL_SESSION" && !session) finishChecking();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (checkingSession && readAuthUrlParams().hasCallback) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-muted-foreground">Confirmando sua conta…</p>
        </div>
      </div>
    );
  }




  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <span className="font-display text-xl tracking-tight">
            RISE <span className="text-gradient-red">LOVABLE</span>
          </span>
        </Link>

        <Card className="p-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AuthTab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <LoginForm />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignupForm next={authParams.next} plan={authParams.plan} />
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleButton next={authParams.next} plan={authParams.plan} />
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao continuar você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailR = emailSchema.safeParse(email);
    const passR = passwordSchema.safeParse(password);
    if (!emailR.success) return toast.error(emailR.error.issues[0].message);
    if (!passR.success) return toast.error(passR.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailR.data,
      password: passR.data,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Senha</Label>
          <ForgotPasswordLink email={email} />
        </div>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

function SignupForm({ next, plan }: { next: string; plan: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailR = emailSchema.safeParse(email);
    const passR = passwordSchema.safeParse(password);
    if (!emailR.success) return toast.error(emailR.error.issues[0].message);
    if (!passR.success) return toast.error(passR.error.issues[0].message);
    setLoading(true);
    const safeNext = sanitizeNextPath(next);
    if (plan) {
      savePendingCheckout(plan);
    }
    const emailRedirectTo = plan
      ? `${window.location.origin}/?checkout=${encodeURIComponent(plan)}`
      : `${window.location.origin}/auth?next=${encodeURIComponent(safeNext)}`;

    const { error } = await supabase.auth.signUp({
      email: emailR.data,
      password: passR.data,
      options: {
        emailRedirectTo,
        data: { full_name: name.trim() },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu email para confirmar (se solicitado).");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-name">Nome</Label>
        <Input
          id="signup-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={100}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Senha</Label>
        <Input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Criando conta…" : "Criar conta"}
      </Button>
    </form>
  );
}

function GoogleButton({ next, plan }: { next: string; plan: string | null }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    const safeNext = sanitizeNextPath(next);
    if (plan) {
      savePendingCheckout(plan);
    }
    const redirectSearch = new URLSearchParams({ next: safeNext });
    if (plan) redirectSearch.set("plan", plan);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth?${redirectSearch.toString()}`,
    });
    if (result.error) {
      setLoading(false);
      toast.error(result.error.message || "Falha ao entrar com Google");
      return;
    }
    // popup ou redirect — a onAuthStateChange faz o resto
  };
  return (
    <Button variant="outline" className="w-full" onClick={handle} disabled={loading}>
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      {loading ? "Redirecionando…" : "Continuar com Google"}
    </Button>
  );
}

function ForgotPasswordLink({ email }: { email: string }) {
  const handle = async () => {
    const emailR = emailSchema.safeParse(email);
    if (!emailR.success) return toast.error("Digite seu email primeiro");
    const { error } = await supabase.auth.resetPasswordForEmail(emailR.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Se o email existir, enviaremos as instruções.");
  };
  return (
    <button
      type="button"
      onClick={handle}
      className="text-xs text-muted-foreground underline-offset-4 hover:underline"
    >
      Esqueci a senha
    </button>
  );
}
