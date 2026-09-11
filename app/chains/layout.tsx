import type { Metadata } from "next";
import { siteUrl } from "../../lib/site-url";

export const metadata: Metadata = {
  title: "Chain stores in Namibia | NeuroCity",
  description: "Browse participating franchise and chain-store brands, then shop their locations through one NeuroCity storefront.",
  alternates: { canonical: `${siteUrl()}/chains` },
};

export default function ChainsLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
