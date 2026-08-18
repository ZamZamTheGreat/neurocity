import type { Metadata, Viewport } from "next";
import { PwaInstaller } from "./components/PwaInstaller";
import "./globals.css";
import "./catalogue.css";
import "./header.css";
import "./storefront-v2.css";
import "./checkout.css";
import "./dashboard-enhancements.css";
import "./payment-workflow.css";
import "./payment-proof-review.css";
import "./ux-consistency.css";
import "./onboarding.css";
import "./merchant-dashboard-v2.css";
import "./mall-management.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07111f",
};

export const metadata: Metadata = {
  applicationName: "NeuroCity",
  title: "NeuroCity | Your city. Your stores. One place.",
  description: "A Windhoek-first digital mall for trusted local storefronts, intelligent discovery, pickup and delivery.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NeuroCity",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/branding/neurocity-mark.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/neurocity-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/branding/neurocity-mark.png",
    apple: [{ url: "/icons/neurocity-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "NeuroCity",
    description: "Your city. Your stores. One place.",
    type: "website",
    images: [{ url: "/branding/neurocity-social.png", width: 1254, height: 690, alt: "NeuroCity — your city, your stores, one place" }],
  },
  twitter: { card: "summary_large_image", title: "NeuroCity", description: "Your city. Your stores. One place.", images: ["/branding/neurocity-social.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to main content</a>{children}<PwaInstaller /></body></html>;
}
