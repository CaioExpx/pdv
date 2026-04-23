import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bambolê Kids PDV",
  description: "Sistema de Ponto de Venda - Bambolê Kids",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={geist.className}>
      <body className="bg-slate-50 min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
