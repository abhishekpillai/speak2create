import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "speak2create - Voice-Powered Image Generation",
  description: "Transform your voice into stunning images. Simply speak what you imagine and watch it come to life with AI-powered image generation.",
  keywords: "voice to image, AI image generation, speech to image, voice commands, image creation",
  openGraph: {
    title: "speak2create - Voice-Powered Image Generation",
    description: "Transform your voice into stunning images with AI",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "speak2create logo with tagline 'Create and edit images with your voice'",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
