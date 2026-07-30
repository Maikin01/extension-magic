import { backendApi } from "@/lib/api/backend-client";

export type DeliveryType = "link" | "text" | "file" | "manual";
export type OrderStatus = "pending" | "paid" | "delivered" | "cancelled";

export type MarketplaceProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string;
  price_cents: number;
  old_price_cents: number | null;
  cover_url: string | null;
  delivery_type: DeliveryType;
  delivery_instructions: string | null;
  stock: number | null;
  rating: number;
  featured: boolean;
};

export type AdminProduct = MarketplaceProduct & {
  delivery_content: string | null;
  stock_items?: string[];
  stock_items_used?: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type ProductInput = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string;
  price_cents: number;
  old_price_cents: number | null;
  cover_url: string | null;
  delivery_type: DeliveryType;
  delivery_content: string | null;
  delivery_instructions: string | null;
  stock: number | null;
  stock_items?: string[];
  rating: number;
  is_active: boolean;
  featured: boolean;
  sort_order: number;
};

export type MyOrder = {
  id: string;
  status: OrderStatus;
  amount_cents: number;
  created_at: string;
  delivered_at: string | null;
  product_name: string | null;
  delivery_type: DeliveryType | null;
  delivery_instructions: string | null;
  delivered_content: string | null;
};

export type AdminOrder = {
  id: string;
  status: OrderStatus;
  amount_cents: number;
  created_at: string;
  delivered_at: string | null;
  buyer_id: string;
  buyer_email: string | null;
  buyer_note: string | null;
  delivered_content: string | null;
  product_name: string | null;
  delivery_type: DeliveryType | null;
};

export const listMarketplaceProducts = () =>
  backendApi.invoke<{ products: MarketplaceProduct[] }>("listMarketplaceProducts");

export const createMarketplaceOrder = (data: { product_id: string; buyer_note?: string }) =>
  backendApi.invoke<{ order: { id: string; status: OrderStatus } }>("createMarketplaceOrder", data);

export const listMyMarketplaceOrders = () =>
  backendApi.invoke<{ orders: MyOrder[] }>("listMyMarketplaceOrders");

export const adminListMarketplaceProducts = () =>
  backendApi.invoke<{ products: AdminProduct[] }>("adminListMarketplaceProducts");

export const adminUploadMarketplaceImage = (data_url: string) =>
  backendApi.invoke<{ url: string }>(
    "adminUploadMarketplaceImage",
    { data_url },
    {
      timeoutMs: 45_000,
    },
  );

export const adminCreateMarketplaceProduct = (data: ProductInput) =>
  backendApi.invoke<{ product: AdminProduct }>("adminCreateMarketplaceProduct", data, {
    timeoutMs: 45_000,
  });

export const adminUpdateMarketplaceProduct = (data: ProductInput & { id: string }) =>
  backendApi.invoke<{ product: AdminProduct }>("adminUpdateMarketplaceProduct", data, {
    timeoutMs: 45_000,
  });

export const adminDeleteMarketplaceProduct = (product_id: string) =>
  backendApi.invoke<{ ok: true }>("adminDeleteMarketplaceProduct", { product_id });

export const adminListMarketplaceOrders = () =>
  backendApi.invoke<{ orders: AdminOrder[] }>("adminListMarketplaceOrders");

export const adminUpdateMarketplaceOrder = (data: {
  order_id: string;
  status: OrderStatus;
  delivered_content?: string | null;
}) =>
  backendApi.invoke<{ order: { id: string; status: OrderStatus } }>(
    "adminUpdateMarketplaceOrder",
    data,
  );

export const DELIVERY_LABELS: Record<DeliveryType, string> = {
  link: "Link de acesso",
  text: "Texto / chave",
  file: "Arquivo (URL de download)",
  manual: "Entrega manual",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export type MarketplacePixResponse = {
  order_id: string;
  status: OrderStatus;
  qr_code: string | null;
  qr_code_base64: string | null;
  ticket_url: string | null;
  expires_at: string | null;
  amount_cents: number;
  product_name: string | null;
};

export type MarketplaceOrderStatusResponse = {
  status: OrderStatus;
  delivered_content: string | null;
  delivery_instructions: string | null;
  product_name: string | null;
};

export const createMarketplacePixCheckout = (data: {
  product_id: string;
  buyer_name: string;
  buyer_whatsapp: string;
  buyer_cpf?: string;
  idempotency_key: string;
}) =>
  backendApi.invoke<MarketplacePixResponse>("createMarketplacePixCheckout", data, {
    timeoutMs: 45_000,
  });

export const getMarketplaceOrderStatus = (order_id: string) =>
  backendApi.invoke<MarketplaceOrderStatusResponse>("getMarketplaceOrderStatus", {
    order_id,
  });
