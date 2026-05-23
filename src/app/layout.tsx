import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SecuritySentinel } from "@/components/SecuritySentinel";
import "./globals.css";

/** Required so middleware `x-nonce` applies (static HTML breaks nonce CSP). */
export const dynamic = "force-dynamic";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Ark Wallet",
  description: "Instant Ark bitcoin payments — Cash App simple",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ark",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="antialiased min-h-dvh">
        <SecuritySentinel />
        {children}
      </body>
    </html>
  );
}
