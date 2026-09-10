type ProductTemplate = {
  optionLabel: string;
  optionPlaceholder: string;
  optionHelp: string;
  choiceLabel: string;
  choiceHelp: string;
  choices: readonly string[];
};

const templates: Array<[RegExp, ProductTemplate]> = [
  [/fashion|clothing/i, { optionLabel: "Colours or styles", optionPlaceholder: "e.g. Black, White, Maroon", optionHelp: "Add each colour or style sold separately.", choiceLabel: "Clothing sizes", choiceHelp: "Select every size offered for each colour or style.", choices: ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"] }],
  [/shoes|accessories/i, { optionLabel: "Colours or finishes", optionPlaceholder: "e.g. Black, Tan, White", optionHelp: "Add each colour or finish sold separately.", choiceLabel: "Shoe sizes", choiceHelp: "Select every shoe size offered for each colour.", choices: ["EU 35", "EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41", "EU 42", "EU 43", "EU 44", "EU 45", "EU 46", "EU 47"] }],
  [/beauty|personal care/i, { optionLabel: "Shade, scent or type", optionPlaceholder: "e.g. Natural, Rose, Unscented", optionHelp: "Add only options that customers buy separately.", choiceLabel: "Volume or pack size", choiceHelp: "Select the available size for each option.", choices: ["Sample", "30 ml", "50 ml", "100 ml", "200 ml", "250 ml", "500 ml", "1 L", "Single", "2 pack", "3 pack"] }],
  [/electronics|technology/i, { optionLabel: "Colour or model", optionPlaceholder: "e.g. Black, Silver, Pro", optionHelp: "Add each model or colour with separate stock.", choiceLabel: "Capacity or specification", choiceHelp: "Select the capacities sold for each model.", choices: ["Standard", "32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB"] }],
  [/home|furniture|living/i, { optionLabel: "Colour or finish", optionPlaceholder: "e.g. Oak, Walnut, White", optionHelp: "Add each finish with separate stock.", choiceLabel: "Size or dimensions", choiceHelp: "Select a common size or add the exact dimensions below.", choices: ["Small", "Medium", "Large", "Single", "Double", "Queen", "King"] }],
  [/hardware|diy|garden/i, { optionLabel: "Type or finish", optionPlaceholder: "e.g. Zinc, Black, Heavy duty", optionHelp: "Add each separately stocked type.", choiceLabel: "Specification or size", choiceHelp: "Select common specifications or add exact values below.", choices: ["Small", "Medium", "Large", "1 m", "2 m", "5 m", "500 g", "1 kg", "5 kg"] }],
  [/groceries|household|food|drink/i, { optionLabel: "Flavour or type", optionPlaceholder: "e.g. Original, Spicy, Sugar free", optionHelp: "Add each flavour or recipe sold separately.", choiceLabel: "Pack, weight or serving", choiceHelp: "Select each package size offered.", choices: ["Single", "250 g", "500 g", "1 kg", "250 ml", "500 ml", "1 L", "2 pack", "6 pack", "12 pack"] }],
  [/sports|fitness|outdoors/i, { optionLabel: "Colour or type", optionPlaceholder: "e.g. Black, Training, Competition", optionHelp: "Add each separately stocked colour or type.", choiceLabel: "Size or capacity", choiceHelp: "Select the relevant apparel, equipment or capacity sizes.", choices: ["XS", "S", "M", "L", "XL", "2XL", "Small", "Medium", "Large", "500 ml", "1 L"] }],
  [/kids|babies|toys/i, { optionLabel: "Colour, theme or model", optionPlaceholder: "e.g. Blue, Safari, Deluxe", optionHelp: "Add each separately stocked design.", choiceLabel: "Age or size", choiceHelp: "Select the age range or product size offered.", choices: ["0–3 months", "3–6 months", "6–12 months", "1–2 years", "2–3 years", "3–4 years", "5–6 years", "7–8 years", "9–10 years", "11–12 years", "13–14 years"] }],
  [/books|stationery|education/i, { optionLabel: "Format or edition", optionPlaceholder: "e.g. Paperback, Hardcover, 2nd edition", optionHelp: "Add each edition or format with separate stock.", choiceLabel: "Language or pack", choiceHelp: "Select a choice only when customers must choose one.", choices: ["English", "Afrikaans", "German", "Single", "5 pack", "10 pack"] }],
  [/automotive|mobility/i, { optionLabel: "Model or finish", optionPlaceholder: "e.g. Black, Standard, Heavy duty", optionHelp: "Add each separately stocked model.", choiceLabel: "Fitment or specification", choiceHelp: "Use exact fitment values where possible.", choices: ["Universal", "Small", "Medium", "Large", "12 V", "24 V"] }],
  [/health|wellness/i, { optionLabel: "Type, flavour or strength", optionPlaceholder: "e.g. Original, Mint, 500 mg", optionHelp: "Add each separately stocked formulation.", choiceLabel: "Pack or volume", choiceHelp: "Select the package size offered.", choices: ["Single", "10 pack", "30 pack", "60 pack", "100 ml", "250 ml", "500 ml"] }],
  [/gifts|hobbies|specialty/i, { optionLabel: "Theme, colour or style", optionPlaceholder: "e.g. Birthday, Gold, Classic", optionHelp: "Add each separately stocked design.", choiceLabel: "Size or pack", choiceHelp: "Select each size or package offered.", choices: ["Small", "Medium", "Large", "Single", "2 pack", "5 pack"] }],
  [/jewellery|luxury/i, { optionLabel: "Metal, colour or finish", optionPlaceholder: "e.g. Gold, Silver, Rose gold", optionHelp: "Add each separately stocked finish.", choiceLabel: "Ring, chain or item size", choiceHelp: "Select common sizes or add an exact size below.", choices: ["One size", "Small", "Medium", "Large", "45 cm", "50 cm", "55 cm", "60 cm"] }],
];

const fallback: ProductTemplate = { optionLabel: "Option, style or model", optionPlaceholder: "e.g. Standard, Black, Premium", optionHelp: "Add only choices with separate stock or SKUs.", choiceLabel: "Size, pack or specification", choiceHelp: "Select common choices or add exact values below.", choices: ["One size", "Small", "Medium", "Large", "Single", "2 pack"] };

export function productTemplateForCategory(category?: string | null): ProductTemplate {
  return templates.find(([pattern]) => pattern.test(category ?? ""))?.[1] ?? fallback;
}
