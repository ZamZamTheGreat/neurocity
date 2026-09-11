export const PAYTODAY_FEE_RATE = 0.025;
export const NEUROCITY_FEE_RATE = 0.015;
export const TOTAL_MERCHANT_FEE_RATE = PAYTODAY_FEE_RATE + NEUROCITY_FEE_RATE;

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function sumMoney(values: readonly number[]) {
  return values.reduce((totalCents, value) => totalCents + Math.round(Number(value) * 100), 0) / 100;
}

export function calculateMerchantAllocation(grossAmount: number) {
  const gross = roundMoney(grossAmount);
  const providerFee = roundMoney(gross * PAYTODAY_FEE_RATE);
  const platformFee = roundMoney(gross * NEUROCITY_FEE_RATE);
  return { grossAmount: gross, providerFee, platformFee, netAmount: roundMoney(gross - providerFee - platformFee) };
}

function allocateFee(totalFeeCents: number, grossCents: number[]) {
  const totalGrossCents = grossCents.reduce((sum, value) => sum + value, 0);
  if (!totalGrossCents) return grossCents.map(() => 0);
  const shares = grossCents.map((gross, index) => {
    const exact = totalFeeCents * gross / totalGrossCents;
    return { index, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let remaining = totalFeeCents - shares.reduce((sum, share) => sum + share.cents, 0);
  for (const share of [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (remaining-- <= 0) break;
    share.cents += 1;
  }
  return shares.sort((a, b) => a.index - b.index).map((share) => share.cents);
}

export function calculateMerchantAllocations(grossAmounts: readonly number[]) {
  const grossCents = grossAmounts.map((value) => Math.round(Number(value) * 100));
  const totalGrossCents = grossCents.reduce((sum, value) => sum + value, 0);
  const providerFees = allocateFee(Math.round(totalGrossCents * PAYTODAY_FEE_RATE), grossCents);
  const platformFees = allocateFee(Math.round(totalGrossCents * NEUROCITY_FEE_RATE), grossCents);
  return grossCents.map((gross, index) => ({
    grossAmount: gross / 100,
    providerFee: providerFees[index] / 100,
    platformFee: platformFees[index] / 100,
    netAmount: (gross - providerFees[index] - platformFees[index]) / 100,
  }));
}
