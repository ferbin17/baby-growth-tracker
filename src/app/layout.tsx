import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Baby Growth Tracker",
  description: "Track baby growth with WHO standards and personalized milestones.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.35),transparent_45%),linear-gradient(135deg,#f8fbff_0%,#fdfefe_100%)] text-slate-900">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
