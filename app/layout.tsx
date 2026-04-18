import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { LanguageToggle } from "@/components/LanguageToggle";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0618",
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mira — Born knowing you.",
  description: "An AI companion trained on 2,000 years of Chinese astrology.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="bg-[#0B0618] text-white antialiased">
        <I18nProvider>
          <LanguageToggle />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
