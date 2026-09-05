import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { PwaInstaller } from "./components/PwaInstaller";
import { MobileDock } from "./components/MobileDock";
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
  title: "NeuroCity | Namibia's connected shopping network",
  description:
    "Explore Namibia's local marketplace, digital malls and live merchant catalogues through one connected shopping network.",
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
    title: "NeuroCity",
    description:
      "Namibia's marketplaces, digital malls and local stores—connected.",
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
    title: "NeuroCity",
    description: "Namibia's connected shopping network.",
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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5GWSF5V0R2"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-5GWSF5V0R2');`}
        </Script>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {children}
        <MobileDock />
        <PwaInstaller />
      </body>
    </html>
  );
}
