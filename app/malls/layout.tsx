import type { Metadata, Viewport } from "next";

export const viewport: Viewport = { themeColor: "#080808" };

export const metadata: Metadata = {
  title: "Digital Malls | NeuroCity",
  description: "Explore Namibia's participating shopping centres through NeuroCity Digital Malls.",
  manifest: "/manifest-malls.webmanifest",
  icons: {
    icon: [
      { url: "/branding/neurocity-malls-mark.png", sizes: "1536x1536", type: "image/png" },
      { url: "/icons/neurocity-malls-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/branding/neurocity-malls-mark.png",
    apple: [{ url: "/icons/neurocity-malls-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function DigitalMallsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
