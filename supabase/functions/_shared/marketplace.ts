/** Entrega (ou marca como pago) um pedido do marketplace após confirmação do Pix. */
export async function deliverMarketplaceOrder(admin: any, orderId: string) {
  const { data: order, error } = await admin
    .from("marketplace_orders")
    .select(
      "*, marketplace_products(id, delivery_type, delivery_content, stock)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;
  if (order.status === "delivered" || order.status === "cancelled") {
    return order;
  }

  const product: any = order.marketplace_products ?? {};

  // Estoque unitário: cada unidade tem seu próprio entregável (link/chave).
  let unitContent: string | null = null;
  if (product.id && product.delivery_type !== "manual") {
    const { data: claimed, error: claimError } = await admin.rpc(
      "claim_marketplace_stock_item",
      { p_product_id: product.id, p_order_id: order.id },
    );
    if (claimError) throw claimError;
    unitContent = (claimed as string | null) ?? null;
  }

  const deliveryContent = order.delivered_content ?? unitContent ??
    product.delivery_content ?? null;
  const autoDeliver = product.delivery_type !== "manual" && !!deliveryContent;
  const updates: Record<string, unknown> = {
    status: autoDeliver ? "delivered" : "paid",
    paid_at: order.paid_at ?? new Date().toISOString(),
  };
  if (autoDeliver) {
    updates.delivered_content = deliveryContent;
    updates.delivered_at = order.delivered_at ?? new Date().toISOString();
    if (!unitContent && product.id && typeof product.stock === "number") {
      await admin
        .from("marketplace_products")
        .update({ stock: Math.max(0, product.stock - 1) })
        .eq("id", product.id);
    }
  }

  const { data: updated, error: updateError } = await admin
    .from("marketplace_orders")
    .update(updates)
    .eq("id", orderId)
    .select()
    .single();
  if (updateError) throw updateError;
  return updated;
}
