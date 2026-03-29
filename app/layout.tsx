import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthButtons } from "./_components/AuthButtons";
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
  title: "NutriMind - The Calorie Bank",
  description: "Modern nutrition tracking with AI-powered Calorie Bank",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <header className="border-b px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <h1 className="text-xl font-bold">NutriMind</h1>
              <nav className="flex items-center gap-4">
                <AuthButtons />
              </nav>
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
