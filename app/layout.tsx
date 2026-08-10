import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});
import { AuthButtons } from "./_components/AuthButtons";
import { ThemeProvider } from "@wrksz/themes/next";
import { MobileNav } from "@/components/MobileNav";
import { DesktopNav } from "@/components/DesktopNav";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "NutriMind Reserve - Your Calorie Account",
  description: "Run your nutrition like an account: allocate today, build a reserve, and spend it deliberately.",
  manifest: "/manifest.webmanifest",
  applicationName: "NutriMind Reserve",
  appleWebApp: { capable: true, title: "NutriMind Reserve", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/nutrimind-mark.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#17140D",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background">
        <ServiceWorkerRegistrar />
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
                  <Image
                    src="/nutrimind-mark.svg"
                    alt=""
                    aria-hidden="true"
                    width={36}
                    height={36}
                    className="h-9 w-9 transition-transform group-hover:rotate-[-4deg]"
                    priority
                  />
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
            <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:pb-0">
              {children}
            </main>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
