import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { merchants, products, productVariants, variantInventory } from "../../../db/schema";

const STOP = new Set(["a", "an", "and", "for", "from", "i", "in", "is", "me", "my", "need", "of", "or", "please", "show", "some", "the", "to", "want", "with"]);
const COLOURS = ["black", "white", "red", "blue", "green", "purple", "maroon", "grey", "gray", "navy", "brown", "yellow", "pink", "orange"];
const SIZES = ["xxs", "xs", "small", "medium", "large", "xl", "xxl", "2xl", "3xl"];

function parseBudget(query: string) {
  const match = query.match(/(?:under|below|less than|max(?:imum)?|budget(?: of)?|n\$|nad|\$)\s*(?:n\$|nad|\$)?\s*([\d,.]+)/i);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

export async function POST(request: Request) {
  try {
    const { message = "" } = await request.json() as { message?: string };
    const query = message.trim().toLowerCase();
    if (query.length < 2 || query.length > 300) return Response.json({ error: "Describe what you need in 2 to 300 characters." }, { status: 400 });
    const db = getDb();
    const catalogue = await db.select({ id: products.id, name: products.name, collection: products.collection, category: products.category, brand: products.brand, description: products.description, price: products.price, salePrice: products.salePrice, imageUrl: products.imageUrl, badge: products.badge, storeId: merchants.id, storeName: merchants.name, storeSlug: merchants.slug }).from(products).innerJoin(merchants, eq(merchants.id, products.merchantId)).where(and(eq(products.status, "published"), eq(merchants.isPublic, true), inArray(merchants.status, ["active", "pilot"])));
    if (!catalogue.length) return Response.json({ reply: "No approved stores have published products yet.", matches: [] }, { headers: { "cache-control": "no-store" } });
    const variants = await db.select().from(productVariants).where(inArray(productVariants.productId, catalogue.map((item) => item.id)));
    const active = variants.filter((item) => item.status === "active");
    const inventory = active.length ? await db.select().from(variantInventory).where(inArray(variantInventory.variantId, active.map((item) => item.id))) : [];
    const budget = parseBudget(query);
    const colours = COLOURS.filter((colour) => new RegExp(`\\b${colour}\\b`, "i").test(query));
    const sizes = SIZES.filter((size) => new RegExp(`\\b${size}\\b`, "i").test(query));
    const terms = query.replace(/n\$|nad/g, " ").split(/[^a-z0-9]+/).filter((term) => term.length > 1 && !STOP.has(term) && !/^\d+$/.test(term));
    const ranked = catalogue.map((product) => {
      const options = active.filter((item) => item.productId === product.id);
      const prices = options.map((item) => Number(item.salePrice ?? item.price)).filter(Number.isFinite);
      const price = prices.length ? Math.min(...prices) : Number(product.salePrice ?? product.price);
      const searchable = [product.name, product.collection, product.category, product.brand, product.description, product.storeName, ...options.flatMap((item) => [item.title, item.color, item.size])].filter(Boolean).join(" ").toLowerCase();
      const availableUnits = options.reduce((total, option) => total + inventory.filter((item) => item.variantId === option.id).reduce((sum, item) => sum + Math.max(0, item.onHand - item.reserved - item.safetyStock), 0), 0);
      let score = terms.reduce((total, term) => total + (product.name.toLowerCase().includes(term) ? 8 : searchable.includes(term) ? 3 : 0), 0);
      if (colours.some((colour) => searchable.includes(colour))) score += 8;
      if (sizes.some((size) => searchable.split(/\W+/).includes(size))) score += 6;
      if (budget !== null && Number.isFinite(price) && price <= budget) score += 5;
      if (availableUnits > 0) score += 2;
      return { product, options, searchable, price, availableUnits, score };
    }).filter((item) => budget === null || !Number.isFinite(item.price) || item.price <= budget).filter((item) => !colours.length || colours.some((colour) => item.searchable.includes(colour))).sort((a, b) => b.score - a.score || b.availableUnits - a.availableUnits || a.price - b.price);
    const relevant = ranked.filter((item) => item.score > 0);
    const selected = (relevant.length ? relevant : ranked).slice(0, 6);
    const constraints = [budget !== null ? `under N$${budget.toLocaleString("en-NA")}` : "", colours.join(" or "), sizes.length ? `size ${sizes.join("/")}` : ""].filter(Boolean).join(", ");
    const reply = selected.length ? `I found ${selected.length} live ${selected.length === 1 ? "match" : "matches"}${constraints ? ` for ${constraints}` : ""}. These results come directly from approved merchant catalogues.` : "I couldn’t find a published product matching every detail. Try widening the budget or removing one preference.";
    return Response.json({ reply, understood: { budget, colours, sizes }, matches: selected.map(({ product, options, price, availableUnits }) => ({ id: product.id, name: product.name, collection: product.collection, description: product.description, price: Number.isFinite(price) ? price : null, imageUrl: product.imageUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(product.storeSlug)}/media?type=product&productId=${product.id}` : product.imageUrl, badge: product.badge, store: { id: product.storeId, name: product.storeName, slug: product.storeSlug }, availableUnits, colours: [...new Set(options.map((item) => item.color).filter(Boolean))], sizes: [...new Set(options.map((item) => item.size).filter(Boolean))] })) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("concierge search failed", error);
    return Response.json({ error: "Neuro couldn’t search the live catalogue right now. Please try again." }, { status: 500 });
  }
}
