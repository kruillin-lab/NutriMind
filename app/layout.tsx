import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthButtons } from "./_components/AuthButtons";
import { ThemeProvider } from "@wrksz/themes/next";
import { MobileNav } from "@/components/MobileNav";
import { DesktopNav } from "@/components/DesktopNav";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NutriMind Reserve - Your Calorie Account",
  description: "Run your nutrition like an account: allocate today, build a reserve, and spend it deliberately.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/onboarding"
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <header className="sticky top-0 z-50 border-b border-border bg-background/92 backdrop-blur-xl">
              <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="group flex items-center gap-3" aria-label="NutriMind Reserve home">
                  <span className="seal flex h-9 w-9 items-center justify-center text-[9px] font-bold tracking-tight transition-transform group-hover:rotate-[-4deg]">
                    NM
                  </span>
                  <span>
                    <span className="block text-[15px] font-bold tracking-[-0.02em] text-foreground">NutriMind</span>
                    <span className="smallcaps accent-text block text-[9px]">Reserve account</span>
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  <DesktopNav showDatabase={process.env.NODE_ENV !== "production"} />
                  <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
                  <AuthButtons />
                  <MobileNav />
                </div>
              </div>
            </header>
            <main className="flex-1">
              {children}
            </main>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
