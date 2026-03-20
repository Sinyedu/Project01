import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Instrument_Serif } from "next/font/google";
import { Navbar } from "@/app/components/layout/Navbar";
import { Footer } from "@/app/components/layout/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Tomorrow’s Archive — Preservation for Everyday Life",
  description:
    "Google Photos organizes. Tomorrow’s Archive preserves. A modern archival system for individuals, families, and communities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorBackground: "#F9F8F6",
          colorText: "#1A1A1A",
          colorPrimary: "#4A5D4E",
          colorInputBackground: "#EAE7E2",
          colorInputText: "#1A1A1A",
        },
      }}
    >
      <html
        lang="en"
        className={`${inter.variable} ${instrumentSerif.variable} antialiased`}
      >
        <body className="min-h-screen bg-background font-sans text-foreground">
          <Navbar />
          <main className="pt-16 min-h-[calc(100vh-64px)]">{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
