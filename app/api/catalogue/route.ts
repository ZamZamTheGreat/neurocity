import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensurePilotCatalogue } from "../../../db/catalogue";
import { merchants, products } from "../../../db/schema";

export async function GET() {
  try {
    await ensurePilotCatalogue();
    const db = getDb();
    const [merchant] = await db.select().from(merchants).where(eq(merchants.slug, "lightwork-clothing")).limit(1);
    if (!merchant || merchant.status === "suspended" || merchant.status === "removed") return Response.json({ error: "This storefront is currently unavailable." }, { status: 404, headers: { "cache-control": "no-store" } });
    const catalogue = await db.select().from(products).where(eq(products.merchantId, merchant.id)).orderBy(asc(products.id));
    return Response.json({ merchant, products: catalogue }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Catalogue unavailable" }, { status: 500 });
  }
}
