UPDATE "product_variants"
SET "status" = 'active'
WHERE "status" IN ('draft', 'needs_confirmation')
  AND "product_id" IN (
    SELECT "id"
    FROM "products"
    WHERE "status" = 'published'
      AND "item_type" = 'product'
  );
