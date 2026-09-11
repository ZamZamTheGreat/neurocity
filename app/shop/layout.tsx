import type { Metadata } from "next";
import { siteUrl } from "../../lib/site-url";

export const metadata: Metadata = {
  title: "Choose how to shop | NeuroCity",
  description: "Browse the complete NeuroCity marketplace or shop through a participating digital mall.",
  alternates: { canonical: `${siteUrl()}/shop` },
};

export default function ShopLayout({ children }: Readonly<{ children: React.ReactNode }>) { return children; }
