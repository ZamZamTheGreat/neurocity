type MerchantProfile = { name: string; category: string; tagline: string | null; description: string | null; contactEmail: string | null; contactPhone: string | null; logoUrl: string | null; bannerUrl: string | null; policies: unknown };
type BranchProfile = { address: string | null; pickupEnabled: boolean; deliveryEnabled: boolean };

// Match the setup/publication contract: contact name is optional.
export function merchantReadiness(merchant: MerchantProfile, branch?: BranchProfile, hours: readonly unknown[] = []) {
  const checks = [
    ["identity", Boolean(merchant.name && merchant.category && merchant.tagline && merchant.description)],
    ["contact", Boolean(merchant.contactEmail && merchant.contactPhone)],
    ["branding", Boolean(merchant.logoUrl && merchant.bannerUrl)],
    ["location", Boolean(branch?.address)],
    ["fulfilment", Boolean(branch?.pickupEnabled || branch?.deliveryEnabled)],
    ["hours", hours.length === 7],
    ["policies", Boolean((merchant.policies as Record<string, unknown> | null)?.returns)],
  ] as const;
  return { percent: Math.round(checks.filter(([, done]) => done).length / checks.length * 100), checks: checks.map(([key, done]) => ({ key, done })) };
}
