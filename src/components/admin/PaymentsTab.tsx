import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Info } from "lucide-react";

export function PaymentsTab() {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <CreditCard className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mb-2 text-xl font-semibold">Pagamentos</h2>
      <Badge variant="outline" className="mb-4">
        <Info className="mr-1 h-3 w-3" /> Não configurado
      </Badge>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">
        A integração com Stripe ainda não foi ativada. Quando estiver pronta, esta
        aba mostrará todos os pagamentos recebidos, reembolsos, assinaturas ativas
        e disputas.
      </p>
      <p className="mx-auto mt-4 max-w-md text-sm">
        Enquanto isso, você pode gerar chaves manualmente na aba{" "}
        <strong>Licenças</strong> e entregá-las aos clientes após confirmar o
        pagamento externamente.
      </p>
    </Card>
  );
}
