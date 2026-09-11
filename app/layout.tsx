import type { Metadata, Viewport } from "next";
import { PwaInstaller } from "./components/PwaInstaller";
import { MobileDock } from "./components/MobileDock";
import { CookieConsent } from "./components/CookieConsent";
import { NativeAppBridge } from "./components/NativeAppBridge";
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
import "./network-home.css";
import "./platform-shell.css";
import "./digital-malls.css";
import "./customer-dashboard-v2.css";
import "./customer-experience-theme.css";
import "./account-access.css";
import "./workspace-drawers.css";
import "./admin-dashboard-v2.css";
import "./platform-polish-v2.css";
import "./shopping-journey-v2.css";
import "./merchant-dashboard-clean.css";
import "./marketplace-dashboard-theme.css";
import { siteUrl } from "../lib/site-url";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080808",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: "NeuroCity",
  title: "NeuroCity | Shop Namibian stores online",
  description:
    "Discover products, services and approved local stores across Namibia. Shop the NeuroCity marketplace, visit digital malls and find local options with Selma-AI.",
  keywords: [
    "Namibia online shopping",
    "Namibian marketplace",
    "local stores Namibia",
    "online shopping Windhoek",
    "Namibia digital mall",
    "Namibian businesses",
  ],
  category: "shopping",
  creator: "NeuroCity",
  publisher: "NeuroCity",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NeuroCity",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      {
        url: "/icons/neurocity-malls-512.png?v=20260902",
        sizes: "512x512",
        type: "image/png",
      },
      { url: "/icons/neurocity-malls-192.png?v=20260902", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/neurocity-malls-192.png?v=20260902",
    apple: [
      { url: "/icons/neurocity-malls-180.png?v=20260902", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "NeuroCity | Shop Namibian stores online",
    description:
      "Discover products, services and approved local stores across Namibia in one connected marketplace.",
    url: siteUrl(),
    siteName: "NeuroCity",
    locale: "en_NA",
    type: "website",
    images: [
      {
        url: "/branding/neurocity-social.png",
        width: 1254,
        height: 690,
        alt: "NeuroCity — your city, your stores, one place",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroCity | Shop Namibian stores online",
    description: "Discover products, services and approved local stores across Namibia.",
    images: ["/branding/neurocity-social.png"],
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
        <NativeAppBridge />
        <MobileDock />
        <PwaInstaller />
        <CookieConsent />
      </body>
    </html>
  );
}
