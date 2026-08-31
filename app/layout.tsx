import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07111f",
};

export const metadata: Metadata = {
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
        url: "/branding/neurocity-mark.png",
        sizes: "512x512",
        type: "image/png",
      },
      { url: "/icons/neurocity-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/branding/neurocity-mark.png",
    apple: [
      { url: "/icons/neurocity-180.png", sizes: "180x180", type: "image/png" },
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
        <MobileDock />
        <PwaInstaller />
      </body>
    </html>
  );
}
