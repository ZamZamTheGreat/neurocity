import type { Metadata, Viewport } from "next";
import { PwaInstaller } from "./components/PwaInstaller";
import "./globals.css";
import "./catalogue.css";
import "./header.css";
import "./storefront-v2.css";
import "./checkout.css";
import "./dashboard-enhancements.css";
import "./payment-workflow.css";
import "./ux-consistency.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#17131f",
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
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/neurocity-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: [{ url: "/icons/neurocity-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "NeuroCity",
    description: "Your city. Your stores. One place.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "NeuroCity digital mall" }],
  },
  twitter: { card: "summary_large_image", title: "NeuroCity", description: "Your city. Your stores. One place.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to main content</a>{children}<PwaInstaller /></body></html>;
}
