import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { merchants, platformTenantMerchants, products, productVariants, storeBranches, storeHours, variantInventory } from "../../../db/schema";
import { resolvePlatformTenant } from "../../../lib/platform-tenant";

const STOP = new Set(["a", "an", "and", "for", "from", "i", "in", "is", "me", "my", "need", "of", "or", "please", "show", "some", "the", "to", "want", "with"]);
const COLOURS = ["black", "white", "red", "blue", "green", "purple", "maroon", "grey", "gray", "navy", "brown", "yellow", "pink", "orange"];
const SIZES = ["xxs", "xs", "small", "medium", "large", "xl", "xxl", "2xl", "3xl"];
const GENERIC_SEARCH_TERMS = new Set(["available", "browse", "buy", "cheapest", "collect", "expensive", "find", "item", "items", "local", "locally", "product", "products", "service", "services", "something", "today"]);

type SearchIntent = { searchTerms: string[]; categories: string[]; brands: string[]; colours: string[]; sizes: string[]; itemType: "any" | "product" | "service"; budgetMin: number | null; budgetMax: number | null; sort: "relevance" | "price_asc" | "price_desc"; location: string | null; fulfillment: "any" | "pickup" | "delivery"; availability: "any" | "open_now" | "today"; needsLocation: boolean };

function outputText(result: { output?: { content?: { type?: string; text?: string }[] }[] }) {
  return result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
}

async function reasonAboutSearch(message: string, history: { role?: string; text?: string }[], catalogue: { category: string | null; brand: string | null; itemType: string }[]): Promise<SearchIntent | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const facets = { categories: [...new Set(catalogue.map((item) => item.category).filter(Boolean))].slice(0, 80), brands: [...new Set(catalogue.map((item) => item.brand).filter(Boolean))].slice(0, 80), itemTypes: [...new Set(catalogue.map((item) => item.itemType))] };
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        model: process.env.OPENAI_CONCIERGE_MODEL ?? "gpt-5.4-mini",
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 450,
        instructions: "You are Selma's shopping-search interpreter for a Namibian marketplace. Convert the shopper's request into search constraints. Resolve follow-ups from recent history, understand synonyms, occasions and local phrasing, and expand only into plausible catalogue terms. N$ and NAD mean Namibian dollars. Treat collect/collection as pickup and available now/open as open_now. Extract a stated Namibian town, suburb or area as location. Set needsLocation true only when the shopper asks for nearby/near me results without naming an area. Do not invent products, stores, branches, prices, hours or availability; the application will verify every result against its live database.",
        input: JSON.stringify({ recentConversation: history.slice(-6), latestRequest: message, liveCatalogueFacets: facets }),
        text: { format: { type: "json_schema", name: "catalogue_search_intent", strict: true, schema: { type: "object", additionalProperties: false, properties: { searchTerms: { type: "array", items: { type: "string" }, maxItems: 12 }, categories: { type: "array", items: { type: "string" }, maxItems: 8 }, brands: { type: "array", items: { type: "string" }, maxItems: 8 }, colours: { type: "array", items: { type: "string" }, maxItems: 6 }, sizes: { type: "array", items: { type: "string" }, maxItems: 6 }, itemType: { type: "string", enum: ["any", "product", "service"] }, budgetMin: { type: ["number", "null"] }, budgetMax: { type: ["number", "null"] }, sort: { type: "string", enum: ["relevance", "price_asc", "price_desc"] }, location: { type: ["string", "null"] }, fulfillment: { type: "string", enum: ["any", "pickup", "delivery"] }, availability: { type: "string", enum: ["any", "open_now", "today"] }, needsLocation: { type: "boolean" } }, required: ["searchTerms", "categories", "brands", "colours", "sizes", "itemType", "budgetMin", "budgetMax", "sort", "location", "fulfillment", "availability", "needsLocation"] } } },
      }),
    });
    if (!response.ok) { console.error("Selma reasoning failed", { status: response.status }); return null; }
    const result = await response.json() as { output?: { content?: { type?: string; text?: string }[] }[] };
    const text = outputText(result);
    return text ? JSON.parse(text) as SearchIntent : null;
  } catch (error) {
    console.error("Selma reasoning unavailable; using local search", error instanceof Error ? error.message : error);
    return null;
  }
}

function parseBudget(query: string) {
  const match = query.match(/(?:under|below|less than|max(?:imum)?|budget(?: of)?|n\$|nad|\$)\s*(?:n\$|nad|\$)?\s*([\d,.]+)/i);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

function numericPrice(...values: unknown[]) {
  const raw = values.find((value) => value !== null && value !== undefined && value !== "");
  if (raw === undefined) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function windhoekClock() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Windhoek", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value("weekday")), time: `${value("hour")}:${value("minute")}` };
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 32_000) return Response.json({ error: "That request is too large." }, { status: 413 });
    const body = await request.json() as { message?: unknown; history?: unknown };
    if (typeof body.message !== "string" || (body.history !== undefined && !Array.isArray(body.history))) return Response.json({ error: "Enter a valid shopping request." }, { status: 400 });
    const message = body.message;
    const history = (Array.isArray(body.history) ? body.history : []) as { role?: string; text?: string }[];
    if (history.length > 20) return Response.json({ error: "Too much conversation context was supplied." }, { status: 400 });
    const query = message.trim().toLowerCase();
    if (query.length < 2 || query.length > 300) return Response.json({ error: "Describe what you need in 2 to 300 characters." }, { status: 400 });
    const db = getDb(); const platform = await resolvePlatformTenant(request);
    const catalogue = await db.select({ id: products.id, itemType: products.itemType, name: products.name, collection: products.collection, category: products.category, brand: products.brand, description: products.description, price: products.price, salePrice: products.salePrice, pricingModel: products.pricingModel, durationMinutes: products.durationMinutes, serviceMode: products.serviceMode, bookingRequired: products.bookingRequired, imageUrl: products.imageUrl, badge: products.badge, storeId: merchants.id, storeName: merchants.name, storeSlug: merchants.slug }).from(platformTenantMerchants).innerJoin(merchants, eq(platformTenantMerchants.merchantId, merchants.id)).innerJoin(products, eq(products.merchantId, merchants.id)).where(and(eq(platformTenantMerchants.tenantId, platform.id), eq(platformTenantMerchants.status, "active"), eq(products.status, "published"), eq(products.availability, "available"), eq(merchants.isPublic, true), inArray(merchants.status, ["active", "pilot"])));
    if (!catalogue.length) return Response.json({ reply: `${platform.name} does not have any in-stock published products yet.`, matches: [], platform: { name: platform.name, slug: platform.slug }, searchedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store, no-cache, must-revalidate" } });
    const variants = await db.select().from(productVariants).where(inArray(productVariants.productId, catalogue.map((item) => item.id)));
    const active = variants.filter((item) => item.status === "active");
    const inventory = active.length ? await db.select().from(variantInventory).where(inArray(variantInventory.variantId, active.map((item) => item.id))) : [];
    const safeHistory = history.filter((item) => ["user", "assistant"].includes(item.role ?? "") && typeof item.text === "string").slice(-6).map((item) => ({ role: item.role, text: item.text!.trim().slice(0, 300) }));
    const intent = await reasonAboutSearch(message.trim(), safeHistory, catalogue);
    if (intent?.needsLocation) return Response.json({ reply: "Which Namibian town, suburb or area should I search near? Once you tell me, I’ll check the relevant stores and live availability.", matches: [], understood: { needsLocation: true }, reasoning: "openai", platform: { name: platform.name, slug: platform.slug }, searchedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store, no-cache, must-revalidate" } });
    const branches = await db.select().from(storeBranches).where(inArray(storeBranches.merchantId, [...new Set(catalogue.map((item) => item.storeId))]));
    const branchHours = branches.length ? await db.select().from(storeHours).where(inArray(storeHours.branchId, branches.map((branch) => branch.id))) : [];
    const clock = windhoekClock();
    const eligibleBranches = branches.filter((branch) => {
      const locationText = `${branch.name} ${branch.address} ${branch.city}`.toLowerCase();
      if (intent?.location && !locationText.includes(intent.location.toLowerCase())) return false;
      if (intent?.fulfillment === "pickup" && !branch.pickupEnabled) return false;
      if (intent?.fulfillment === "delivery" && !branch.deliveryEnabled) return false;
      const hours = branchHours.find((item) => item.branchId === branch.id && item.dayOfWeek === clock.day);
      if (intent?.availability === "open_now" && (!hours || hours.closed || !hours.opensAt || !hours.closesAt || clock.time < hours.opensAt || clock.time >= hours.closesAt)) return false;
      if (intent?.availability === "today" && (!hours || hours.closed || !hours.closesAt || clock.time >= hours.closesAt)) return false;
      return true;
    });
    const priorQueries = safeHistory.filter((item) => item.role === "user").slice(-4).map((item) => item.text.toLowerCase()).filter(Boolean);
    const latestConstraint = <T,>(extract: (value: string) => T | null, current: string) => extract(current) ?? priorQueries.slice().reverse().map(extract).find((value) => value !== null) ?? null;
    const detectColours = (value: string) => { const found = COLOURS.filter((colour) => new RegExp(`\\b${colour}\\b`, "i").test(value)); return found.length ? found : null; };
    const detectSizes = (value: string) => { const found = SIZES.filter((size) => new RegExp(`\\b${size}\\b`, "i").test(value)); return found.length ? found : null; };
    const budget = intent?.budgetMax ?? latestConstraint(parseBudget, query); const minimumBudget = intent?.budgetMin ?? null;
    const colours = [...new Set((intent?.colours?.length ? intent.colours : latestConstraint(detectColours, query) ?? []).map((item) => item.toLowerCase()))];
    const sizes = [...new Set((intent?.sizes?.length ? intent.sizes : latestConstraint(detectSizes, query) ?? []).map((item) => item.toLowerCase()))];
    const localTerms = [...priorQueries, query].join(" ").replace(/n\$|nad/g, " ").split(/[^a-z0-9]+/).filter((term) => term.length > 1 && !STOP.has(term) && !COLOURS.includes(term) && !SIZES.includes(term) && !/^\d+$/.test(term));
    const terms = [...new Set([...(intent?.searchTerms ?? []), ...(intent?.categories ?? []), ...(intent?.brands ?? []), ...localTerms].flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/)).filter((term) => term.length > 1 && !STOP.has(term)))];
    const ranked = catalogue.map((product) => {
      const productBranches = eligibleBranches.filter((branch) => branch.merchantId === product.storeId);
      const eligibleBranchIds = new Set(productBranches.map((branch) => branch.id));
      const options = active.filter((item) => item.productId === product.id).filter((option) => inventory.filter((item) => item.variantId === option.id && eligibleBranchIds.has(item.branchId)).some((item) => item.onHand - item.reserved - item.safetyStock > 0));
      const prices = options.map((item) => numericPrice(item.salePrice, item.price)).filter((value): value is number => value !== null); const price = prices.length ? Math.min(...prices) : numericPrice(product.salePrice, product.price);
      const searchable = [product.name, product.collection, product.category, product.brand, product.description, product.storeName, ...options.flatMap((item) => [item.title, item.color, item.size])].filter(Boolean).join(" ").toLowerCase();
      const availableUnits = product.itemType === "service" ? (productBranches.length ? 1 : 0) : options.reduce((total, option) => total + inventory.filter((item) => item.variantId === option.id && eligibleBranchIds.has(item.branchId)).reduce((sum, item) => sum + Math.max(0, item.onHand - item.reserved - item.safetyStock), 0), 0);
      const coreTerms = terms.filter((term) => !COLOURS.includes(term) && !SIZES.includes(term) && !GENERIC_SEARCH_TERMS.has(term));
      const matchesCore = coreTerms.some((term) => searchable.includes(term)) || Boolean(intent?.categories.some((category) => product.category?.toLowerCase().includes(category.toLowerCase()))) || Boolean(intent?.brands.some((brand) => product.brand?.toLowerCase().includes(brand.toLowerCase())));
      const broadFilteredRequest = coreTerms.length === 0 && (budget !== null || minimumBudget !== null || Boolean(intent && (intent.itemType !== "any" || intent.sort !== "relevance")));
      let score = terms.reduce((total, term) => total + (product.name.toLowerCase().includes(term) ? 8 : searchable.includes(term) ? 3 : 0), 0);
      if (intent?.categories.some((category) => product.category?.toLowerCase().includes(category.toLowerCase()))) score += 10;
      if (intent?.brands.some((brand) => product.brand?.toLowerCase().includes(brand.toLowerCase()))) score += 10;
      if (colours.some((colour) => searchable.includes(colour))) score += 8; if (sizes.some((size) => options.some((option) => option.size?.toLowerCase() === size))) score += 6; if (budget !== null && Number.isFinite(price) && price <= budget) score += 5; if (availableUnits > 0) score += 2;
      return { product, options, searchable, price, availableUnits, score, matchesCore: matchesCore || broadFilteredRequest, branches: productBranches };
    }).filter((item) => (item.product.itemType === "service" || item.options.length > 0) && item.availableUnits > 0).filter((item) => !intent || intent.itemType === "any" || item.product.itemType === intent.itemType).filter((item) => budget === null || (item.price !== null && item.price <= budget)).filter((item) => minimumBudget === null || (item.price !== null && item.price >= minimumBudget)).filter((item) => !colours.length || colours.some((colour) => item.searchable.includes(colour))).filter((item) => !sizes.length || sizes.some((size) => item.options.some((option) => option.size?.toLowerCase() === size))).sort((a, b) => { const left = a.price ?? Number.POSITIVE_INFINITY, right = b.price ?? Number.POSITIVE_INFINITY; if (intent?.sort === "price_asc") return left - right; if (intent?.sort === "price_desc") return (b.price ?? Number.NEGATIVE_INFINITY) - (a.price ?? Number.NEGATIVE_INFINITY); return b.score - a.score || b.availableUnits - a.availableUnits || left - right; });
    const selected = ranked.filter((item) => item.matchesCore).slice(0, 6);
    const constraints = [budget !== null ? `under N$${budget.toLocaleString("en-NA")}` : "", colours.join(" or "), sizes.length ? `size ${sizes.join("/")}` : "", intent?.location ?? "", intent?.fulfillment === "pickup" ? "for pickup" : intent?.fulfillment === "delivery" ? "with delivery" : "", intent?.availability === "open_now" ? "open now" : intent?.availability === "today" ? "available today" : ""].filter(Boolean).join(", ");
    const reply = selected.length ? `I found ${selected.length} verified ${selected.length === 1 ? "match" : "matches"}${constraints ? ` for ${constraints}` : ""} on ${platform.name}. I checked current catalogue, branch fulfilment${intent?.availability !== "any" ? " and today's store hours" : ""}${selected.some((item) => item.product.itemType !== "service") ? ", plus live stock" : ""}.` : `I couldn't verify a match on ${platform.name} with every requested detail${constraints ? ` (${constraints})` : ""}. Try another area, a broader budget or fewer filters.`;
    return Response.json({ reply, understood: { budget, minimumBudget, colours, sizes, itemType: intent?.itemType ?? "any", location: intent?.location ?? null, fulfillment: intent?.fulfillment ?? "any", availability: intent?.availability ?? "any", terms }, reasoning: intent ? "openai" : "local_fallback", platform: { name: platform.name, slug: platform.slug }, searchedAt: new Date().toISOString(), matches: selected.map(({ product, options, price, availableUnits, branches }) => ({ id: product.id, itemType: product.itemType, name: product.name, collection: product.collection, description: product.description, price, imageUrl: product.imageUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(product.storeSlug)}/media?type=product&productId=${product.id}` : product.imageUrl, badge: product.badge, store: { id: product.storeId, name: product.storeName, slug: product.storeSlug }, availableUnits, fulfillment: { pickup: branches.some((branch) => branch.pickupEnabled), delivery: branches.some((branch) => branch.deliveryEnabled) }, branches: branches.map((branch) => ({ name: branch.name, address: branch.address, city: branch.city })), colours: [...new Set(options.map((item) => item.color).filter(Boolean))], sizes: [...new Set(options.map((item) => item.size).filter(Boolean))] })) }, { headers: { "cache-control": "no-store, no-cache, must-revalidate" } });
  } catch (error) {
    console.error("concierge search failed", error);
    return Response.json({ error: "Selma couldn't search the live catalogue right now. Please try again." }, { status: 500 });
  }
}
