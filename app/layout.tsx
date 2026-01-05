import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Kvitty - Bokföring för småföretag",
  description: "Enkel bokföring för små team",
  openGraph: {
    images: ["/assets/SCR-20260105-mywx.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/assets/SCR-20260105-mywx.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={inter.variable}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
