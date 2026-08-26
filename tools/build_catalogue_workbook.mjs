import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs/neurocity-validation-kit";
await fs.mkdir(outputDir, { recursive: true });

const wb = Workbook.create();
const instructions = wb.worksheets.add("Instructions");
const profile = wb.worksheets.add("Store Profile");
const products = wb.worksheets.add("Products");
const variants = wb.worksheets.add("Variants");
const inventory = wb.worksheets.add("Inventory");
const provider = wb.worksheets.add("Provider Scorecard");
const lists = wb.worksheets.add("Lists");

const C = {
  ink: "#101218", charcoal: "#20242B", gold: "#D59B32", violet: "#7457FF",
  cloud: "#F2F4F7", white: "#FFFFFF", input: "#FFF8E8", green: "#EAF7F0",
  red: "#FFF1F1", border: "#D9DEE7", muted: "#667085"
};

function title(sheet, range, text, subtitle) {
  range.merge();
  range.values = [[text]];
  range.format = { fill: C.ink, font: { bold: true, color: C.white, size: 18 }, verticalAlignment: "center" };
  range.format.rowHeight = 34;
  if (subtitle) {
    const row = range.address.split(":")[1].replace(/[^0-9]/g, "");
    const endCol = range.address.split(":")[1].replace(/[0-9]/g, "");
    const sub = sheet.getRange(`A${Number(row)+1}:${endCol}${Number(row)+1}`);
    sub.merge();
    sub.values = [[subtitle]];
    sub.format = { fill: C.cloud, font: { color: C.muted, italic: true }, wrapText: true };
    sub.format.rowHeight = 30;
  }
}

function header(range) {
  range.format = { fill: C.charcoal, font: { bold: true, color: C.white }, wrapText: true, verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: C.border } };
  range.format.rowHeight = 30;
}

function body(range) {
  range.format = { verticalAlignment: "center", borders: { preset: "inside", style: "thin", color: C.border } };
}

for (const s of [instructions, profile, products, variants, inventory, provider, lists]) {
  s.showGridLines = false;
}

// Instructions
title(instructions, instructions.getRange("A1:F1"), "NeuroCity Merchant Onboarding Workbook", "Starter workbook for LightWork Clothing. Yellow cells require merchant confirmation; do not publish unconfirmed information.");
instructions.getRange("A4:B10").values = [
  ["Step", "Action"],
  [1, "Complete the Store Profile sheet, especially operating hours, order owner, pickup, delivery, and returns."],
  [2, "Review the starter product rows. Replace historic or promotional information with current sellable product information."],
  [3, "Assign a unique merchant SKU to every product and variant."],
  [4, "Enter a numeric price in NAD. Leave unpublished products as Draft until all required fields are confirmed."],
  [5, "Complete size/colour variants and branch-level inventory. Available stock is calculated automatically."],
  [6, "Return this workbook with approved product images in a separate folder using the Image File Name values."],
];
header(instructions.getRange("A4:B4"));
body(instructions.getRange("A5:B10"));
instructions.getRange("A12:F15").values = [
  ["Publishing gate", "Required?", "Publishing gate", "Required?", "Publishing gate", "Required?"],
  ["Current product name", "Yes", "Current price", "Yes", "At least one approved image", "Yes"],
  ["SKU and variants", "Yes", "Pickup/delivery eligibility", "Yes", "Return policy reference", "Yes"],
  ["Stock or confirm-first mode", "Yes", "Merchant approval", "Yes", "No expired date/price artwork", "Yes"],
];
header(instructions.getRange("A12:F12"));
body(instructions.getRange("A13:F15"));
instructions.getRange("A:A").format.columnWidth = 15;
instructions.getRange("B:B").format.columnWidth = 72;
instructions.getRange("C:F").format.columnWidth = 22;
instructions.getRange("A4:F15").format.wrapText = true;

// Store profile
title(profile, profile.getRange("A1:D1"), "Store Profile", "Known details are prefilled. Complete the yellow fields before pilot onboarding.");
profile.getRange("A4:D24").values = [
  ["Field", "Current value", "Status", "Notes / confirmation"],
  ["Business name", "LightWork Clothing", "Known", ""],
  ["Category", "Fashion / streetwear", "Known", ""],
  ["Primary contact", "Zephan Stadhauer", "Known", ""],
  ["Phone", "081 495 3446", "Known", ""],
  ["Email", "lightworkclothing.na@gmail.com", "Known", ""],
  ["Website", "https://lightworkclothing.com", "Known", "Website is not currently treated as reliable transactional catalogue."],
  ["Number of branches", 1, "Known", ""],
  ["Pickup location", "Baines Centre, Pioneerspark, Windhoek", "Partial", "Confirm exact unit/instructions."],
  ["Operating days", "", "Needed", ""],
  ["Operating hours", "", "Needed", ""],
  ["Order manager", "", "Needed", "Name and backup."],
  ["Order notification channel", "", "Needed", "Email, SMS, WhatsApp, or dashboard."],
  ["Target order response time", "", "Needed", "During operating hours."],
  ["Pickup preparation time", "", "Needed", ""],
  ["Delivery areas", "", "Needed", "List suburbs/zones."],
  ["Delivery fee method", "", "Needed", "Fixed, per zone, quoted, or free threshold."],
  ["Delivery timing", "", "Needed", ""],
  ["Pay on collection allowed", "", "Needed", "Yes/No and hold/no-show rule."],
  ["Cancellation policy", "", "Needed", ""],
  ["Exchange/return policy", "", "Needed", ""],
];
header(profile.getRange("A4:D4"));
body(profile.getRange("A5:D24"));
profile.getRange("B13:B24").format.fill = C.input;
profile.getRange("D5:D24").format.fill = "#FAFAFB";
profile.getRange("A:A").format.columnWidth = 27;
profile.getRange("B:B").format.columnWidth = 46;
profile.getRange("C:C").format.columnWidth = 14;
profile.getRange("D:D").format.columnWidth = 46;
profile.getRange("A4:D24").format.wrapText = true;
profile.freezePanes.freezeRows(4);

// Lists and validations
lists.getRange("A1:E8").values = [
  ["Product Status", "Category", "Yes/No", "Inventory Mode", "Provider Status"],
  ["Draft", "Fashion", "Yes", "Exact stock", "Not contacted"],
  ["Ready for review", "Beauty and personal care", "No", "Confirm first", "Contacted"],
  ["Approved", "Gifts, home and living", "", "Preorder", "Meeting scheduled"],
  ["Published", "", "", "Made to order", "Response received"],
  ["Archived", "", "", "", "Shortlisted"],
  ["Needs confirmation", "", "", "", "Rejected"],
  ["", "", "", "", "Selected"],
];
header(lists.getRange("A1:E1"));
lists.getRange("A:E").format.columnWidth = 25;

// Products
const productHeaders = [["Merchant SKU", "Product Name", "Category", "Description", "Base Price (NAD)", "Status", "Pickup", "Delivery", "Inventory Mode", "Image File Name", "Source / confirmation note"]];
products.getRange("A4:K4").values = productHeaders;
products.getRange("A5:K8").values = [
  ["LW-CROWN-V1", "Crown V1 Cuffed Tracksuit", "Fashion", "Black tracksuit. Confirm current product description and whether pieces are sold together.", 1249.99, "Needs confirmation", "Yes", "", "Confirm first", "lightwork-crown-v1.png", "Historic supplied artwork shows N$1,249.99 and preorder language dated 20/04/2025. Confirm everything before publication."],
  ["LW-MET23-LS", "Metallic 23 Longsleeve - Maroon", "Fashion", "Maroon long-sleeve. Supplied artwork states 200 GSM, 100% cotton, and DTF artwork; merchant must confirm current claims.", null, "Needs confirmation", "Yes", "", "Confirm first", "lightwork-metallic-23.jpeg", "Supplied promotional artwork; current price, sizes and stock unknown."],
  ["LW-MAJ-EDIT", "Majesteric Edition Zip Hoodie", "Fashion", "Black zip hoodie with butterfly artwork in several visible colourways.", null, "Needs confirmation", "Yes", "", "Confirm first", "lightwork-majesteric.jpeg", "Supplied promotional artwork; colour names, price, sizes and stock unknown."],
  ["LW-ESO-SET", "Esoteric T-shirt and Shorts", "Fashion", "T-shirt and shorts shown in several colours. Confirm whether sold as a set or separately.", null, "Needs confirmation", "Yes", "", "Confirm first", "lightwork-esoteric.jpeg", "Supplied promotional artwork; product structure, prices, sizes and stock unknown."],
];
title(products, products.getRange("A1:K1"), "Products", "Starter evidence only. Every row remains unpublished until merchant confirmation.");
header(products.getRange("A4:K4"));
body(products.getRange("A5:K104"));
products.getRange("A5:K104").format.wrapText = true;
products.getRange("E5:E104").format.numberFormat = '"N$"#,##0.00';
products.getRange("A5:K8").format.fill = C.input;
products.getRange("C5:C104").dataValidation = { rule: { type: "list", formula1: "Lists!$B$2:$B$4" } };
products.getRange("F5:F104").dataValidation = { rule: { type: "list", formula1: "Lists!$A$2:$A$7" } };
products.getRange("G5:H104").dataValidation = { rule: { type: "list", formula1: "Lists!$C$2:$C$3" } };
products.getRange("I5:I104").dataValidation = { rule: { type: "list", formula1: "Lists!$D$2:$D$5" } };
const pWidths = [18, 32, 18, 55, 18, 20, 12, 12, 20, 30, 60];
"ABCDEFGHIJK".split("").forEach((col, i) => products.getRange(`${col}:${col}`).format.columnWidth = pWidths[i]);
products.freezePanes.freezeRows(4);

// Variants
title(variants, variants.getRange("A1:I1"), "Variants", "Create one row for each sellable size/colour combination. Visible colourways below still require official merchant confirmation.");
variants.getRange("A4:I4").values = [["Variant SKU", "Merchant SKU", "Size", "Colour", "Additional Price (NAD)", "Barcode", "Active?", "Weight (kg)", "Confirmation Note"]];
variants.getRange("A5:I12").values = [
  ["", "LW-CROWN-V1", "", "Black", 0, "", "No", null, "Confirm sizes and current sale status."],
  ["", "LW-MET23-LS", "", "Maroon", 0, "", "No", null, "Confirm official colour and sizes."],
  ["", "LW-MAJ-EDIT", "", "Blue", 0, "", "No", null, "Confirm official colour name and availability."],
  ["", "LW-MAJ-EDIT", "", "Red", 0, "", "No", null, "Confirm official colour name and availability."],
  ["", "LW-MAJ-EDIT", "", "Pink", 0, "", "No", null, "Confirm official colour name and availability."],
  ["", "LW-MAJ-EDIT", "", "Purple", 0, "", "No", null, "Confirm official colour name and availability."],
  ["", "LW-ESO-SET", "", "", 0, "", "No", null, "Create official colour/size combinations after confirming set versus separates."],
  ["", "LW-ESO-SET", "", "", 0, "", "No", null, "Reserved starter row."],
];
header(variants.getRange("A4:I4"));
body(variants.getRange("A5:I204"));
variants.getRange("A5:I12").format.fill = C.input;
variants.getRange("E5:E204").format.numberFormat = '"N$"#,##0.00';
variants.getRange("G5:G204").dataValidation = { rule: { type: "list", formula1: "Lists!$C$2:$C$3" } };
const vWidths = [22, 20, 14, 20, 20, 20, 14, 16, 55];
"ABCDEFGHI".split("").forEach((col, i) => variants.getRange(`${col}:${col}`).format.columnWidth = vWidths[i]);
variants.getRange("A4:I204").format.wrapText = true;
variants.freezePanes.freezeRows(4);

// Inventory
title(inventory, inventory.getRange("A1:H1"), "Inventory", "Enter numbers only for exact-stock products. Available stock is formula-driven and cannot fall below zero.");
inventory.getRange("A4:H4").values = [["Variant SKU", "Branch", "On Hand", "Reserved", "Safety Stock", "Available", "Last Count Date", "Adjustment Note"]];
inventory.getRange("A5:B12").values = [
  ["", "Baines Centre"], ["", "Baines Centre"], ["", "Baines Centre"], ["", "Baines Centre"],
  ["", "Baines Centre"], ["", "Baines Centre"], ["", "Baines Centre"], ["", "Baines Centre"],
];
inventory.getRange("F5").formulas = [["=IF(COUNT(C5:E5)=0,\"\",MAX(0,C5-D5-E5))"]];
inventory.getRange("F5:F204").fillDown();
header(inventory.getRange("A4:H4"));
body(inventory.getRange("A5:H204"));
inventory.getRange("A5:E204").format.fill = C.input;
inventory.getRange("C5:F204").format.numberFormat = "#,##0";
inventory.getRange("G5:G204").format.numberFormat = "yyyy-mm-dd";
const iWidths = [22, 24, 14, 14, 16, 16, 20, 50];
"ABCDEFGH".split("").forEach((col, i) => inventory.getRange(`${col}:${col}`).format.columnWidth = iWidths[i]);
inventory.getRange("A4:H204").format.wrapText = true;
inventory.freezePanes.freezeRows(4);

// Provider scorecard
title(provider, provider.getRange("A1:H1"), "Payment Provider Scorecard", "Complete after FNB Namibia, Nedbank Namibia, and PayToday responses. Mandatory regulatory/contractual fit overrides weighted scores.");
provider.getRange("A4:H4").values = [["Provider", "Status", "Regulatory Fit", "Pilot Payment Fit (0-5)", "Future Marketplace (0-5)", "Operations & Reconciliation (0-5)", "Commercial & Support (0-5)", "Weighted Score"]];
provider.getRange("A5:C7").values = [
  ["FNB Namibia", "Not contacted", "Unconfirmed"],
  ["Nedbank Namibia", "Not contacted", "Unconfirmed"],
  ["PayToday", "Not contacted", "Unconfirmed"],
];
provider.getRange("H5").formulas = [["=IF(COUNT(D5:G5)<4,\"\",ROUND((D5*0.3+E5*0.25+F5*0.25+G5*0.2)/5*100,0))"]];
provider.getRange("H5:H7").fillDown();
header(provider.getRange("A4:H4"));
body(provider.getRange("A5:H7"));
provider.getRange("B5:G7").format.fill = C.input;
provider.getRange("H5:H7").format.numberFormat = '0"%"';
provider.getRange("B5:B7").dataValidation = { rule: { type: "list", formula1: "Lists!$E$2:$E$8" } };
provider.getRange("D5:G7").dataValidation = { rule: { type: "whole", operator: "between", formula1: 0, formula2: 5 } };
const scoreWidths = [24, 22, 24, 24, 26, 34, 28, 20];
"ABCDEFGH".split("").forEach((col, i) => provider.getRange(`${col}:${col}`).format.columnWidth = scoreWidths[i]);
provider.getRange("A4:H7").format.wrapText = true;

// Compact verification
const inspectProducts = await wb.inspect({ kind: "table", range: "Products!A1:K8", include: "values,formulas", tableMaxRows: 10, tableMaxCols: 11 });
console.log(inspectProducts.ndjson);
const inspectScore = await wb.inspect({ kind: "table", range: "Provider Scorecard!A4:H7", include: "values,formulas", tableMaxRows: 6, tableMaxCols: 8 });
console.log(inspectScore.ndjson);
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
console.log(errors.ndjson);

for (const [name, range] of [
  ["Instructions", "A1:F15"], ["Store Profile", "A1:D24"], ["Products", "A1:K12"],
  ["Variants", "A1:I14"], ["Inventory", "A1:H14"], ["Provider Scorecard", "A1:H8"], ["Lists", "A1:E8"]
]) {
  const preview = await wb.render({ sheetName: name, range, scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/preview-${name.replaceAll(" ", "-").toLowerCase()}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(`${outputDir}/NeuroCity_LightWork_Onboarding_and_Payment_Scorecard.xlsx`);
console.log(`${outputDir}/NeuroCity_LightWork_Onboarding_and_Payment_Scorecard.xlsx`);
