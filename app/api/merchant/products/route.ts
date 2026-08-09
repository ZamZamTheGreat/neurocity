import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, products } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  const rows = await getDb().select().from(products).where(eq(products.merchantId, access.merchantId)).orderBy(asc(products.id));
  return Response.json({ products: rows });
}

export async function PATCH(request: Request) {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  try {
    const payload = await request.json() as { id?: number; name?: string; price?: number | null; status?: string; merchantConfirmed?: boolean };
    if (!Number.isInteger(payload.id)) return Response.json({ error: "A valid product is required." }, { status: 400 });
    const db = getDb();
    const [current] = await db.select().from(products).where(and(eq(products.id, payload.id!), eq(products.merchantId, access.merchantId))).limit(1);
    if (!current) return Response.json({ error: "Product not found." }, { status: 404 });

    const name = payload.name?.trim() ?? current.name;
    const price = payload.price === undefined ? current.price : payload.price;
    const allowedStatuses = new Set(["needs_confirmation", "draft", "published", "archived"]);
    const status = payload.status ?? current.status;
    if (!allowedStatuses.has(status)) return Response.json({ error: "Invalid product status." }, { status: 400 });
    if (!name) return Response.json({ error: "Product name is required." }, { status: 400 });
    if (price !== null && (!Number.isFinite(price) || price < 0)) return Response.json({ error: "Price must be a valid non-negative amount." }, { status: 400 });
    if (status === "published" && (!payload.merchantConfirmed || price === null)) return Response.json({ error: "Publishing requires merchant confirmation and a current price." }, { status: 409 });

    const [updated] = await db.update(products).set({ name, price, status }).where(and(eq(products.id, current.id), eq(products.merchantId, access.merchantId))).returning();
    await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "product.updated", resourceType: "product", resourceId: String(current.id), metadata: JSON.stringify({ before: { name: current.name, price: current.price, status: current.status }, after: { name, price, status } }), createdAt: new Date() });
    return Response.json({ product: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Product update failed" }, { status: 500 });
  }
}
