export const merchantCategories = [
  { name: "Fashion & Clothing", icon: "👗", includes: "Men’s, women’s, kids, streetwear, formalwear, sportswear, underwear, traditional wear, maternity and uniforms" },
  { name: "Shoes & Accessories", icon: "👟", includes: "Sneakers, formal shoes, handbags, wallets, belts, sunglasses, hats, watches and jewellery" },
  { name: "Beauty & Personal Care", icon: "💄", includes: "Cosmetics, skincare, haircare, fragrances, barber products, nail products, beauty supplies and personal care" },
  { name: "Electronics & Technology", icon: "📱", includes: "Phones, laptops, computers, gaming, TVs, audio, cameras, accessories, smart devices and electronics" },
  { name: "Home, Furniture & Living", icon: "🏠", includes: "Furniture, décor, bedding, kitchenware, appliances, lighting, home accessories and storage" },
  { name: "Hardware, DIY & Garden", icon: "🛠️", includes: "Tools, building supplies, paint, plumbing, electrical supplies, gardening and outdoor equipment" },
  { name: "Groceries & Household", icon: "🛒", includes: "Supermarkets, convenience stores, fresh produce, meat, beverages, household goods and cleaning products" },
  { name: "Food & Drink", icon: "🍔", includes: "Restaurants, takeaways, cafés, bakeries, desserts, fast food, catering and speciality food" },
  { name: "Sports, Fitness & Outdoors", icon: "🏋️", includes: "Gym equipment, supplements, sportswear, sporting goods, camping, hiking, cycling and outdoor gear" },
  { name: "Kids, Babies & Toys", icon: "🧸", includes: "Baby products, children’s clothing, toys, educational products, school supplies and maternity products" },
  { name: "Books, Stationery & Education", icon: "📚", includes: "Books, stationery, office supplies, art supplies, school products and educational materials" },
  { name: "Automotive & Mobility", icon: "🚗", includes: "Car parts, tyres, accessories, detailing products, motorcycle products, bicycles and vehicle electronics" },
  { name: "Health & Wellness", icon: "💊", includes: "Pharmacies, wellness products, medical supplies, optical, hearing products and health equipment" },
  { name: "Gifts, Hobbies & Specialty", icon: "🎁", includes: "Gifts, flowers, crafts, collectibles, gaming merchandise, party supplies, pet products and speciality shops" },
  { name: "Jewellery & Luxury", icon: "💎", includes: "Jewellery, premium watches, luxury accessories, designer products and high-end gifts" },
  { name: "Services", icon: "🧾", includes: "Salons, barbers, repairs, tailoring, printing, photography, travel, insurance, telecoms and other bookable services" },
] as const;

export const merchantCategoryNames = merchantCategories.map((category) => category.name);

export function isMerchantCategory(value: unknown): value is typeof merchantCategoryNames[number] {
  return typeof value === "string" && merchantCategoryNames.includes(value as typeof merchantCategoryNames[number]);
}
