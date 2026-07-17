import { useEffect, useRef, useState } from "react";
import { translateError } from "@/lib/translate-error";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Check, Loader2, ShieldCheck, QrCode } from "lucide-react";
import { toast } from "sonner";
import { createPixCheckout, getCheckoutStatus } from "@/lib/payments.functions";
import { formatPrice } from "@/lib/license-utils";

type Plan = { slug: string; name: string; price_cents: number };
type Step = "form" | "pix" | "success";

export function PixCheckoutDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: Plan | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createPix = useServerFn(createPixCheckout);
  const getStatus = useServerFn(getCheckoutStatus);

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [wpp, setWpp] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<Awaited<ReturnType<typeof createPix>> | null>(null);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("form");
      setName("");
      setWpp("");
      setCpf("");
      setPix(null);
      setLicenseKey(null);
      setCopied(false);
      setLoading(false);
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (step !== "pix" || !pix) return;
    const tick = async () => {
      try {
        const res = await getStatus({ data: { payment_id: pix.payment_id } });
        if (res.status === "approved") {
          setLicenseKey(res.license_key);
          setStep("success");
          if (pollRef.current) window.clearInterval(pollRef.current);
        } else if (["cancelled", "rejected", "expired", "error"].includes(res.status)) {
          toast.error(`Pagamento ${res.status}. Tente novamente.`);
          if (pollRef.current) window.clearInterval(pollRef.current);
        }
      } catch (e: any) {
        console.warn("poll error", e);
      }
    };
    tick();
    pollRef.current = window.setInterval(tick, 4000) as unknown as number;
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [step, pix, getStatus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    const cleanWpp = wpp.replace(/\D+/g, "");
    const cleanCpf = cpf.replace(/\D+/g, "");
    if (name.trim().length < 2) return toast.error("Informe seu nome.");
    if (cleanWpp.length < 10) return toast.error("Informe um WhatsApp válido (com DDD).");
    if (cleanCpf && cleanCpf.length !== 11) return toast.error("CPF inválido.");
    setLoading(true);
    try {
      const res = await createPix({
        data: {
          plan_slug: plan.slug,
          buyer_name: name.trim(),
          buyer_whatsapp: cleanWpp,
          buyer_cpf: cleanCpf || undefined,
        },
      });
      setPix(res);
      setStep("pix");
    } catch (err: any) {
      toast.error(translateError(err) || "Falha ao gerar Pix.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#0a0a0a] text-white">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Assinar {plan.name}
              </DialogTitle>
              <DialogDescription className="text-white/60">
                Pagamento via Pix — <span className="font-bold text-white">{formatPrice(plan.price_cents)}</span>.
                Preencha os dados abaixo para gerar o QR Code.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="pix-name">Nome completo</Label>
                <Input
                  id="pix-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="bg-white/5"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pix-wpp">WhatsApp (com DDD)</Label>
                <Input
                  id="pix-wpp"
                  value={wpp}
                  onChange={(e) => setWpp(e.target.value)}
                  placeholder="(61) 99999-9999"
                  className="bg-white/5"
                  required
                />
                <p className="text-[11px] text-white/40">
                  Enviaremos sua chave de licença por aqui após a confirmação.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pix-cpf">CPF (recomendado)</Label>
                <Input
                  id="pix-cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="bg-white/5"
                  inputMode="numeric"
                />
                <p className="text-[11px] text-white/40">
                  Reduz o risco do antifraude do Mercado Pago recusar o Pix.
                </p>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="btn-neon h-12 w-full text-sm font-bold uppercase tracking-widest"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando Pix…
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" /> Gerar QR Code Pix
                  </>
                )}
              </Button>
            </form>
          </>
        )}

        {step === "pix" && pix && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Pague com Pix</DialogTitle>
              <DialogDescription className="text-white/60">
                Escaneie o QR Code ou copie o código abaixo. Assim que
                confirmarmos o pagamento, sua chave de licença aparece aqui.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl border border-white/10 bg-white p-2">
                {pix.qr_code_base64 ? (
                  <img
                    src={`data:image/png;base64,${pix.qr_code_base64}`}
                    alt="QR Code Pix"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-black" />
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
                  Copia e cola
                </div>
                <div className="mb-2 max-h-16 overflow-y-auto break-all font-mono text-[11px] text-white/70">
                  {pix.qr_code}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-white/10 bg-white/5 text-xs"
                  onClick={() => copyToClipboard(pix.qr_code)}
                >
                  {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar código Pix"}
                </Button>
              </div>
              <div className="flex items-center justify-center gap-2 text-[11px] text-white/40">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Aguardando pagamento…
              </div>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Pagamento confirmado! 🎉</DialogTitle>
              <DialogDescription className="text-white/60">
                Guarde sua chave de licença. Use-a para ativar a extensão.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="ring-glow rounded-xl border border-primary/40 bg-primary/5 p-4">
                <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Sua chave
                </div>
                <div className="break-all font-mono text-sm font-bold text-white">
                  {licenseKey ?? "—"}
                </div>
              </div>
              {licenseKey && (
                <Button
                  type="button"
                  className="btn-neon h-12 w-full text-sm font-bold uppercase tracking-widest"
                  onClick={() => copyToClipboard(licenseKey)}
                >
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Copiado" : "Copiar chave"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/10 bg-white/5"
                onClick={() => onOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
