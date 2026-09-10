UPDATE "merchant_payment_allocations"
SET
  "provider_fee" = round(("gross_amount"::numeric * 0.025), 2)::double precision,
  "platform_fee" = round(("gross_amount"::numeric * 0.015), 2)::double precision,
  "net_amount" = (
    "gross_amount"::numeric
    - round(("gross_amount"::numeric * 0.025), 2)
    - round(("gross_amount"::numeric * 0.015), 2)
  )::double precision,
  "updated_at" = now()
WHERE "settlement_status" IN ('pending_payment', 'unpaid', 'scheduled', 'due', 'processing', 'refund_required');
