import type { Metadata } from "next";
import { siteUrl } from "../../lib/site-url";

export const metadata: Metadata = {
  title: "Marketplace | NeuroCity",
  description: "Browse products, services and approved local stores across Namibia on the NeuroCity marketplace.",
  alternates: { canonical: `${siteUrl()}/marketplace` },
  openGraph: {
    title: "NeuroCity Marketplace",
    description: "Browse products, services and approved local stores across Namibia.",
    url: `${siteUrl()}/marketplace`,
  },
};

export default function MarketplaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
