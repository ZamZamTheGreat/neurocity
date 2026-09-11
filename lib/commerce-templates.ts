export const commerceTypeIds = ["apparel", "general_retail", "prepared_food", "grocery", "service_booking"] as const;
export type CommerceType = typeof commerceTypeIds[number];
export type CommerceAttributes = Record<string, string | number | boolean | string[] | null>;

export const commerceTemplates: Record<CommerceType, { label: string; description: string; itemType: "product" | "service"; capabilities: string[] }> = {
  apparel: { label: "Apparel", description: "Clothing, footwear and accessories with colour and size stock.", itemType: "product", capabilities: ["variants", "inventory", "pickup", "delivery", "returns"] },
  general_retail: { label: "General retail", description: "Electronics, homeware, gifts and other individually stocked goods.", itemType: "product", capabilities: ["variants", "inventory", "pickup", "delivery", "warranty"] },
  prepared_food: { label: "Prepared food", description: "Made-to-order menu items with preparation and menu availability.", itemType: "product", capabilities: ["modifiers", "menu_availability", "preparation_time", "pickup", "delivery"] },
  grocery: { label: "Grocery & FMCG", description: "Packaged, fresh or weight-based goods with substitution rules.", itemType: "product", capabilities: ["inventory", "unit_pricing", "substitutions", "pickup", "delivery"] },
  service_booking: { label: "Service / booking", description: "Appointments, scheduled work and quotation-based services.", itemType: "service", capabilities: ["scheduling", "appointments", "deposits"] },
};

export function isCommerceType(value: unknown): value is CommerceType { return typeof value === "string" && commerceTypeIds.includes(value as CommerceType); }
export function commerceTypeForCategory(category: string, itemType: string = "product"): CommerceType {
  if (itemType === "service" || /service|salon|barber|repair|photograph|tailor/i.test(category)) return "service_booking";
  if (/fashion|cloth|shoe|accessor|jewellery|luxury|sport/i.test(category)) return "apparel";
  if (/food|drink|restaurant|takeaway|café|cafe|bakery/i.test(category)) return "prepared_food";
  if (/grocer|household|supermarket|convenience|butcher/i.test(category)) return "grocery";
  return "general_retail";
}
export function sanitizeCommerceAttributes(type: CommerceType, value: unknown): CommerceAttributes {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const allowed: Record<CommerceType, string[]> = {
    apparel: ["gender", "garmentType", "fit", "material"], general_retail: ["modelNumber", "warranty"],
    prepared_food: ["preparationMinutes", "dietaryNotes", "allergens"], grocery: ["unitType", "unitSize", "substitutionPolicy"],
    service_booking: ["staffSelection", "depositPercent"],
  };
  const result: CommerceAttributes = {};
  for (const key of allowed[type]) {
    const entry = input[key];
    if (typeof entry === "string") result[key] = entry.trim().slice(0, 500);
    else if (typeof entry === "number" && Number.isFinite(entry)) result[key] = entry;
    else if (typeof entry === "boolean") result[key] = entry;
  }
  return result;
}
