import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PDV - Ponto de Venda",
  description: "Sistema de Ponto de Venda",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={geist.className}>
      <body className="bg-gray-50 min-h-screen">
        <Navigation />
        <main className="ml-64 min-h-screen p-6">{children}</main>
      </body>
    </html>
  );
}
