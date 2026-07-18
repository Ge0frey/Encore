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

export const metadata: Metadata = {
  title: "ENCORE — every match is a track",
  description: `The World Cup as a playable record collection. ${tracks.length} matches cut from live TxLINE market data.`,
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
