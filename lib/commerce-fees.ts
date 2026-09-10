export const PAYTODAY_FEE_RATE = 0.025;
export const NEUROCITY_FEE_RATE = 0.015;
export const TOTAL_MERCHANT_FEE_RATE = PAYTODAY_FEE_RATE + NEUROCITY_FEE_RATE;

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateMerchantAllocation(grossAmount: number) {
  const gross = roundMoney(grossAmount);
  const providerFee = roundMoney(gross * PAYTODAY_FEE_RATE);
  const platformFee = roundMoney(gross * NEUROCITY_FEE_RATE);
  return { grossAmount: gross, providerFee, platformFee, netAmount: roundMoney(gross - providerFee - platformFee) };
}
