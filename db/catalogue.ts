import { env } from "cloudflare:workers";

const merchantInsert = `
  INSERT OR IGNORE INTO merchants (id, name, slug, category, status, created_at)
  VALUES (1, 'LightWork Clothing', 'lightwork-clothing', 'Fashion / streetwear', 'pilot', unixepoch())
`;

const productSeeds = [
  ["LW-CROWN-V1", "Crown V1 Cuffed Tracksuit", "Crown V1", "Black tracksuit. Product description and current sale status require merchant confirmation.", 1249.99, "needs_confirmation", "/lightwork-crown-v1.png", "Price to confirm"],
  ["LW-MET23-LS", "Metallic 23 Longsleeve", "Metallic 23", "Maroon long-sleeve. Material, sizes, current price and stock require merchant confirmation.", null, "needs_confirmation", "/lightwork-metallic-23.jpeg", "Coming to the pilot"],
  ["LW-MAJ-EDIT", "Majesteric Zip Hoodie", "Majesteric Edition", "Black zip hoodie shown in four colourways. Official variants require merchant confirmation.", null, "needs_confirmation", "/lightwork-majesteric.jpeg", "4 colourways"],
  ["LW-ESO-SET", "Esoteric Tee & Shorts", "Esoteric", "T-shirt and shorts shown in several colours. Set structure, sizes, prices and stock require confirmation.", null, "needs_confirmation", "/lightwork-esoteric.jpeg", "Details to confirm"],
] as const;

export async function ensurePilotCatalogue() {
  const db = env.DB;
  await db.prepare(merchantInsert).run();
  await db.batch(productSeeds.map((product) => db.prepare(`
    INSERT OR IGNORE INTO products
      (merchant_id, sku, name, collection, description, price, status, image_url, badge)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(...product)));
}
