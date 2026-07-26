import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FOR THE FUTURE - Tailoring & Fashion Management",
  description: "Complete management system for FOR THE FUTURE — sales orders, deliveries, billing, and reports.",
  keywords: ["FOR THE FUTURE", "FTF", "Tailor", "Management", "Sales", "Delivery", "Billing"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} antialiased`}
        style={{ background: '#0b0d0f', color: '#e8eae9', fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </body>
    </html>
  );
}
