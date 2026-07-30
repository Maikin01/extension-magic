import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_SIDE = 600;
const RATIO_TOLERANCE = 0.03;
const OUTPUT_SIDE = 1000;
const MAX_DATA_URL_BYTES = 900_000;

function readDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number) {
  return canvas.toDataURL("image/webp", quality);
}

function optimizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIDE;
      canvas.height = OUTPUT_SIDE;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }
      context.drawImage(img, 0, 0, OUTPUT_SIDE, OUTPUT_SIDE);
      const qualities = [0.82, 0.72, 0.62, 0.52];
      const optimized = qualities
        .map((quality) => canvasToDataUrl(canvas, quality))
        .find((dataUrl) => dataUrl.length <= MAX_DATA_URL_BYTES);
      if (!optimized) {
        reject(new Error("Não foi possível reduzir a imagem. Use uma imagem menos detalhada."));
        return;
      }
      resolve(optimized);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível processar a imagem."));
    };
    img.src = url;
  });
}

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export function ImageDropzone({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem (PNG, JPG ou WEBP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande. Máximo de 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const { width, height } = await readDimensions(file);
      if (Math.abs(width / height - 1) > RATIO_TOLERANCE) {
        toast.error(
          `Proporção inválida (${width}x${height}). Use imagens quadradas 1:1 — ex.: 1000x1000 px.`,
        );
        return;
      }
      if (width < MIN_SIDE || height < MIN_SIDE) {
        toast.error(`Imagem pequena demais. Mínimo de ${MIN_SIDE}x${MIN_SIDE} px.`);
        return;
      }
      const optimized = await optimizeImage(file);
      const response = await fetch(optimized);
      const optimizedFile = await response.blob();
      const path = `products/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage
        .from("marketplace")
        .upload(path, optimizedFile, {
          cacheControl: "31536000",
          contentType: "image/webp",
          upsert: false,
        });

      if (error) {
        if (/bucket not found/i.test(error.message)) {
          onChange(optimized);
          toast.success("Imagem adicionada ao produto!");
          return;
        }
        throw new Error(`Não foi possível enviar a imagem: ${error.message}`);
      }

      const { data, error: signError } = await supabase.storage
        .from("marketplace")
        .createSignedUrl(path, TEN_YEARS);
      if (signError) throw signError;
      onChange(data.signedUrl);
      toast.success("Imagem enviada!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar a imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={cn(
          "relative flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center transition-colors",
          dragging && "border-primary bg-primary/10",
        )}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Capa do produto"
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
            <div className="relative z-10 rounded-lg bg-background/80 px-3 py-2 text-xs font-medium">
              Clique ou arraste para trocar a imagem
            </div>
          </>
        ) : uploading ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Enviando imagem…</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-7 w-7 text-primary" />
            <p className="text-sm font-medium">Arraste a imagem aqui</p>
            <p className="text-xs text-muted-foreground">
              ou clique para escolher • PNG, JPG ou WEBP até 5 MB
            </p>
            <p className="text-xs font-medium text-primary">
              Proporção obrigatória 1:1 (quadrada) — recomendado 1000x1000 px
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex gap-2">
        <Input
          value={value}
          placeholder="Ou cole a URL da imagem"
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
        {!value && (
          <Button type="button" variant="outline" size="icon" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
