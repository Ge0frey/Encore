import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import TxlineProvider from "@/components/TxlineProvider";
import { tracks } from "@/lib/tracks";
import "./globals.css";

const sans = Space_Grotesk({
  variable: "--font-sans-var",
  subsets: ["latin"],
});

const mono = Space_Mono({
  variable: "--font-mono-var",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const title = "ENCORE — every match is a track";
const description = `The World Cup as a playable record collection. ${tracks.length} matches cut from live TxLINE market data.`;

export const metadata: Metadata = {
  metadataBase: new URL("https://encorefans.vercel.app"),
  title,
  description,
  openGraph: {
    type: "website",
    siteName: "ENCORE",
    url: "/",
    title,
    description,
    // static masthead card (cards/preview.html); /track and /run segments
    // override this with their own generated opengraph-image
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "ENCORE — every match is a track" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@TXODDSOfficial",
    title,
    description,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TxlineProvider>{children}</TxlineProvider>
      </body>
    </html>
  );
}
