/**
 * Next.js 16 renamed the middleware file convention to proxy.
 * Clerk's auth wrapper is still named `clerkMiddleware`, but it returns a
 * Next-compatible proxy function and keeps the existing route protection.
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
