import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";

import { getPublicAppUrl } from "@/lib/game-server-url";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const SITE_URL = getPublicAppUrl();

const SITE_TITLE = "Gamezo";
const SITE_DESCRIPTION =
  "Race a stranger to vibe-code a tiny game, then let the crowd decide who wins.";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: "https://eazo.ai/favicon.ico",
  },
  // Social preview cards (Open Graph + Twitter). Most platforms (X,
  // Facebook, LinkedIn, Slack, Discord, WeChat, iMessage) read these
  // tags directly. For the preview image, drop a 1200×630 PNG/JPG at
  // `src/app/opengraph-image.png` — Next.js auto-detects file-based
  // metadata and overrides `openGraph.images` below at build time.
  openGraph: {
    type: "website",
    siteName: "Gamezo",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
