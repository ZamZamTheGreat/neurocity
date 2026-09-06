export const apparelSizes = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;
export const shoeSizes = ["EU 35", "EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45", "EU 46", "EU 47"] as const;
export const kidsSizes = ["0–3 months", "3–6 months", "6–12 months", "1–2 years", "2–3 years", "3–4 years", "5–6 years", "7–8 years", "9–10 years", "11–12 years", "13–14 years"] as const;
export const generalSizes = ["One size", "Small", "Medium", "Large"] as const;

export function sizeOptionsForCategory(category?: string | null): readonly string[] {
  const value = category?.toLocaleLowerCase() ?? "";
  if (/shoe|sneaker|boot|sandal|footwear/.test(value)) return shoeSizes;
  if (/kid|baby|toddler|child/.test(value)) return kidsSizes;
  if (/sport|fitness|outdoor/.test(value)) return [...apparelSizes, ...shoeSizes];
  if (/fashion|cloth|shirt|tee|hoodie|dress|trouser|jean|apparel|uniform|underwear/.test(value)) return apparelSizes;
  return generalSizes;
}
