import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroCity | Your city. Your stores. One place.",
  description: "A Windhoek-first digital mall for trusted local storefronts, intelligent discovery, pickup and delivery.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "NeuroCity",
    description: "Your city. Your stores. One place.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "NeuroCity digital mall" }],
  },
  twitter: { card: "summary_large_image", title: "NeuroCity", description: "Your city. Your stores. One place.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
