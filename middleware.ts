/**
 * NOTE: Next.js 16.2.1 Migration Deferred
 *
 * Next.js 16.2.1 deprecated `middleware.ts` in favor of `proxy.ts`.
 * However, Clerk's `clerkMiddleware` requires Edge runtime features,
 * and `proxy.ts` only supports Node.js runtime (Edge is NOT supported
 * per Next.js 16 docs: "The edge runtime is NOT supported in proxy").
 *
 * The codemod (`npx @next/codemod@canary middleware-to-proxy`) skipped
 * this file due to Edge runtime incompatibility.
 *
 * Therefore, keeping `middleware.ts` until Clerk supports Node.js proxy runtime.
 * This file continues to work in Next.js 16.2.1 (deprecated but not removed).
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/user(.*)",
]);

const isApiRoute = createRouteMatcher(["/api(.*)"]);

// Allow test auth bypass in development
const isTestAuth = (req: Request) => {
  if (process.env.NODE_ENV === "production") return false;
  const url = new URL(req.url);
  const hasTestParam = url.searchParams.has("test-user-id");
  const hasTestHeader = req.headers.get("X-Test-User-Id") !== null;
  return hasTestParam || hasTestHeader;
};

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) && !isTestAuth(req)) {
    const { userId } = await auth();
    if (!userId) {
      // For API routes, return JSON error instead of redirecting
      if (isApiRoute(req)) {
        return new Response(
          JSON.stringify({ error: "Unauthorized", message: "No valid authentication session found" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      // For page routes, let Clerk handle the redirect
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
