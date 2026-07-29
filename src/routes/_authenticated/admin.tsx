import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LicensesTab } from "@/components/admin/LicensesTab";
import { PlansTab } from "@/components/admin/PlansTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { PaymentsTab } from "@/components/admin/PaymentsTab";
import { LogsTab } from "@/components/admin/LogsTab";
import { ResellersTab } from "@/components/admin/ResellersTab";
import { MarketplaceTab } from "@/components/admin/MarketplaceTab";
import { AdminGate } from "@/components/admin/AdminGate";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Rise Lovable" }] }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="min-h-screen bg-muted/20">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Painel administrativo
            </h1>
            <p className="text-muted-foreground">
              Gerencie licenças, planos, usuários e pagamentos.
            </p>
          </div>
        </header>

        <AdminGate>
          <Tabs defaultValue="licenses">
            <TabsList className="mb-6">
              <TabsTrigger value="licenses">Licenças</TabsTrigger>
              <TabsTrigger value="plans">Planos</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="resellers">Revendedores</TabsTrigger>
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              <TabsTrigger value="payments">Pagamentos</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="licenses">
              <LicensesTab />
            </TabsContent>
            <TabsContent value="plans">
              <PlansTab />
            </TabsContent>
            <TabsContent value="users">
              <UsersTab />
            </TabsContent>
            <TabsContent value="resellers">
              <ResellersTab />
            </TabsContent>
            <TabsContent value="marketplace">
              <MarketplaceTab />
            </TabsContent>
            <TabsContent value="payments">
              <PaymentsTab />
            </TabsContent>
            <TabsContent value="logs">
              <LogsTab />
            </TabsContent>
          </Tabs>
        </AdminGate>
      </main>
    </div>
  );
}
