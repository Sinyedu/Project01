import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/app/components/layout/Navbar";
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
  title: "BigApp — The Archive of Tomorrow",
  description:
    "Capture the living web before it disappears. Preserve social posts, community threads, and local stories in a format that lasts decades.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground">
        <ClerkProvider
          appearance={{
            variables: {
              colorBackground: "#18181b",
              colorText: "#fafafa",
              colorPrimary: "#f59e0b",
              colorInputBackground: "#27272a",
              colorInputText: "#fafafa",
            },
          }}
        >
          <Navbar />
          <main className="pt-16">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
