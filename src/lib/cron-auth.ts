import type { RuntimeEnvironment } from "./runtime-env";

export function hasAuthorizedCronRequest(
  request: Pick<Request, "headers">,
  environment: RuntimeEnvironment = process.env
): boolean {
  const secret = environment.CRON_SECRET;
  const hasBearerSecret = Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`
  );
  const isVercelCron =
    environment.VERCEL === "1" && request.headers.get("x-vercel-cron") === "1";

  return hasBearerSecret || isVercelCron;
}
