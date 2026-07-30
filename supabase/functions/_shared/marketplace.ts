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
  const autoDeliver = product.delivery_type !== "manual" &&
    !!product.delivery_content;
  const updates: Record<string, unknown> = {
    status: autoDeliver ? "delivered" : "paid",
    paid_at: order.paid_at ?? new Date().toISOString(),
  };
  if (autoDeliver) {
    updates.delivered_content = order.delivered_content ??
      product.delivery_content;
    updates.delivered_at = order.delivered_at ?? new Date().toISOString();
    if (product.id && typeof product.stock === "number") {
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
