import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { translateError } from "@/lib/translate-error";

type QueryErrorStateProps = {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
};

export function QueryErrorState({
  error,
  title = "Não foi possível carregar os dados",
  onRetry,
  isRetrying = false,
  className = "",
}: QueryErrorStateProps) {
  const normalized = error instanceof Error ? error : new Error(String(error));

  return (
    <Card
      className={`border-destructive/40 bg-destructive/5 p-6 text-center ${className}`.trim()}
      role="alert"
    >
      <h3 className="font-semibold text-destructive">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{translateError(normalized)}</p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? "Tentando novamente…" : "Tentar novamente"}
        </Button>
      )}
    </Card>
  );
}
