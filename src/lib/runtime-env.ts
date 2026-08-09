export type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export type HostedRuntimeValidation = {
  ready: boolean;
  missing: string[];
  invalid: string[];
};

const REQUIRED_HOSTED_VARIABLES = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
  "TURSO_AUTH_TOKEN",
  "CRON_SECRET",
] as const;

export function isHostedRuntime(environment: RuntimeEnvironment = process.env): boolean {
  return environment.NUTRIMIND_HOSTED_RUNTIME === "1";
}

export function validateHostedRuntime(
  environment: RuntimeEnvironment = process.env
): HostedRuntimeValidation {
  if (!isHostedRuntime(environment)) {
    return { ready: true, missing: [], invalid: [] };
  }

  const missing: string[] = REQUIRED_HOSTED_VARIABLES.filter(
    (name) => !environment[name]
  );

  if (!environment.NUTRIMIND_OPENAI_API_KEY && !environment.OPENAI_API_KEY) {
    missing.push("NUTRIMIND_OPENAI_API_KEY or OPENAI_API_KEY");
  }

  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) {
    missing.push("DATABASE_URL");
  }

  const invalid = databaseUrl && !isRemoteLibsqlDatabaseUrl(databaseUrl)
    ? ["DATABASE_URL"]
    : [];

  return {
    ready: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
}

export function getDatabaseRuntimeConfig(
  environment: RuntimeEnvironment = process.env
): { url: string; authToken: string | undefined } {
  const validation = validateHostedRuntime(environment);

  if (!validation.ready) {
    const issues = [...validation.missing, ...validation.invalid].join(", ");
    throw new Error(`Hosted runtime configuration is incomplete: ${issues}`);
  }

  return {
    url: environment.DATABASE_URL || "file:./prisma/dev.db",
    authToken: environment.TURSO_AUTH_TOKEN,
  };
}

function isRemoteLibsqlDatabaseUrl(databaseUrl: string): boolean {
  return databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://");
}
