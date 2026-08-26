import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { merchants, platformTenantMerchants, products, productVariants, variantInventory } from "../../../db/schema";
import { resolvePlatformTenant } from "../../../lib/platform-tenant";

const STOP = new Set(["a", "an", "and", "for", "from", "i", "in", "is", "me", "my", "need", "of", "or", "please", "show", "some", "the", "to", "want", "with"]);
const COLOURS = ["black", "white", "red", "blue", "green", "purple", "maroon", "grey", "gray", "navy", "brown", "yellow", "pink", "orange"];
const SIZES = ["xxs", "xs", "small", "medium", "large", "xl", "xxl", "2xl", "3xl"];

function parseBudget(query: string) {
  const match = query.match(/(?:under|below|less than|max(?:imum)?|budget(?: of)?|n\$|nad|\$)\s*(?:n\$|nad|\$)?\s*([\d,.]+)/i);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

export async function POST(request: Request) {
  try {
    const { message = "", history = [] } = await request.json() as { message?: string; history?: { role?: string; text?: string }[] };
    const query = message.trim().toLowerCase();
    if (query.length < 2 || query.length > 300) return Response.json({ error: "Describe what you need in 2 to 300 characters." }, { status: 400 });
    const db = getDb(); const platform = await resolvePlatformTenant(request);
    const catalogue = await db.select({ id: products.id, itemType: products.itemType, name: products.name, collection: products.collection, category: products.category, brand: products.brand, description: products.description, price: products.price, salePrice: products.salePrice, pricingModel: products.pricingModel, durationMinutes: products.durationMinutes, serviceMode: products.serviceMode, bookingRequired: products.bookingRequired, imageUrl: products.imageUrl, badge: products.badge, storeId: merchants.id, storeName: merchants.name, storeSlug: merchants.slug }).from(platformTenantMerchants).innerJoin(merchants, eq(platformTenantMerchants.merchantId, merchants.id)).innerJoin(products, eq(products.merchantId, merchants.id)).where(and(eq(platformTenantMerchants.tenantId, platform.id), eq(platformTenantMerchants.status, "active"), eq(products.status, "published"), eq(products.availability, "available"), eq(merchants.isPublic, true), inArray(merchants.status, ["active", "pilot"])));
    if (!catalogue.length) return Response.json({ reply: `${platform.name} does not have any in-stock published products yet.`, matches: [], platform: { name: platform.name, slug: platform.slug }, searchedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store, no-cache, must-revalidate" } });
    const variants = await db.select().from(productVariants).where(inArray(productVariants.productId, catalogue.map((item) => item.id)));
    const active = variants.filter((item) => item.status === "active");
    const inventory = active.length ? await db.select().from(variantInventory).where(inArray(variantInventory.variantId, active.map((item) => item.id))) : [];
    const priorQueries = history.filter((item) => item.role === "user" && typeof item.text === "string").slice(-4).map((item) => item.text!.trim().toLowerCase()).filter(Boolean);
    const latestConstraint = <T,>(extract: (value: string) => T | null, current: string) => extract(current) ?? priorQueries.slice().reverse().map(extract).find((value) => value !== null) ?? null;
    const detectColours = (value: string) => { const found = COLOURS.filter((colour) => new RegExp(`\\b${colour}\\b`, "i").test(value)); return found.length ? found : null; };
    const detectSizes = (value: string) => { const found = SIZES.filter((size) => new RegExp(`\\b${size}\\b`, "i").test(value)); return found.length ? found : null; };
    const budget = latestConstraint(parseBudget, query); const colours = latestConstraint(detectColours, query) ?? []; const sizes = latestConstraint(detectSizes, query) ?? [];
    const terms = [...new Set([...priorQueries, query].join(" ").replace(/n\$|nad/g, " ").split(/[^a-z0-9]+/).filter((term) => term.length > 1 && !STOP.has(term) && !COLOURS.includes(term) && !SIZES.includes(term) && !/^\d+$/.test(term)))];
    const ranked = catalogue.map((product) => {
      const options = active.filter((item) => item.productId === product.id).filter((option) => inventory.filter((item) => item.variantId === option.id).some((item) => item.onHand - item.reserved - item.safetyStock > 0));
      const prices = options.map((item) => Number(item.salePrice ?? item.price)).filter(Number.isFinite); const price = prices.length ? Math.min(...prices) : Number(product.salePrice ?? product.price);
      const searchable = [product.name, product.collection, product.category, product.brand, product.description, product.storeName, ...options.flatMap((item) => [item.title, item.color, item.size])].filter(Boolean).join(" ").toLowerCase();
      const availableUnits = product.itemType === "service" ? 1 : options.reduce((total, option) => total + inventory.filter((item) => item.variantId === option.id).reduce((sum, item) => sum + Math.max(0, item.onHand - item.reserved - item.safetyStock), 0), 0);
      let score = terms.reduce((total, term) => total + (product.name.toLowerCase().includes(term) ? 8 : searchable.includes(term) ? 3 : 0), 0);
      if (colours.some((colour) => searchable.includes(colour))) score += 8; if (sizes.some((size) => options.some((option) => option.size?.toLowerCase() === size))) score += 6; if (budget !== null && Number.isFinite(price) && price <= budget) score += 5; if (availableUnits > 0) score += 2;
      return { product, options, searchable, price, availableUnits, score };
    }).filter((item) => (item.product.itemType === "service" || item.options.length > 0) && item.availableUnits > 0).filter((item) => budget === null || !Number.isFinite(item.price) || item.price <= budget).filter((item) => !colours.length || colours.some((colour) => item.searchable.includes(colour))).filter((item) => !sizes.length || sizes.some((size) => item.options.some((option) => option.size?.toLowerCase() === size))).sort((a, b) => b.score - a.score || b.availableUnits - a.availableUnits || a.price - b.price);
    const relevant = ranked.filter((item) => item.score > 0); const selected = (relevant.length ? relevant : ranked).slice(0, 6);
    const constraints = [budget !== null ? `under N$${budget.toLocaleString("en-NA")}` : "", colours.join(" or "), sizes.length ? `size ${sizes.join("/")}` : ""].filter(Boolean).join(", ");
    const reply = selected.length ? `I found ${selected.length} live ${selected.length === 1 ? "match" : "matches"}${constraints ? ` for ${constraints}` : ""} from local stores on ${platform.name}. Prices are in Namibian dollars, and I checked the available options and stock just now.` : `I couldn't find an in-stock match on ${platform.name} with every detail. Try a slightly wider budget, another colour or a broader size, and I’ll check the local catalogues again.`;
    return Response.json({ reply, understood: { budget, colours, sizes }, platform: { name: platform.name, slug: platform.slug }, searchedAt: new Date().toISOString(), matches: selected.map(({ product, options, price, availableUnits }) => ({ id: product.id, name: product.name, collection: product.collection, description: product.description, price: Number.isFinite(price) ? price : null, imageUrl: product.imageUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(product.storeSlug)}/media?type=product&productId=${product.id}` : product.imageUrl, badge: product.badge, store: { id: product.storeId, name: product.storeName, slug: product.storeSlug }, availableUnits, colours: [...new Set(options.map((item) => item.color).filter(Boolean))], sizes: [...new Set(options.map((item) => item.size).filter(Boolean))] })) }, { headers: { "cache-control": "no-store, no-cache, must-revalidate" } });
  } catch (error) {
    console.error("concierge search failed", error);
    return Response.json({ error: "Selma couldn't search the live catalogue right now. Please try again." }, { status: 500 });
  }
}
