import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIKOSAN - Sistem Informasi Kosan | Kelurahan Akehuda",
  description:
    "Sistem pendataan penghuni kosan digital untuk Kelurahan Akehuda, Ternate. Memudahkan kelurahan dalam memantau dan mendata penghuni kosan.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

import { NetworkStatus } from "@/components/network-status";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body className="font-sans antialiased">
        <NetworkStatus />
        {children}
      </body>
    </html>
  );
}
