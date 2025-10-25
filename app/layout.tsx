import type { Metadata } from "next";
import { Archivo_Black, Roboto } from "next/font/google";
import "./globals.css";
import Background from "@/components/Background";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

const archivo = Archivo_Black({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Ivan Brocas's Portfolio",
  description: "A portfolio with some of my projects and skills",
};

// TODO:
// - add spanish

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} antialiased`}>
        <Background />
        {children}
      </body>
    </html>
  );
}
