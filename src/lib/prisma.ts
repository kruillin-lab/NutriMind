import { PrismaClient } from "@/src/generated/prisma/client";
import { PrismaLibSql as PrismaLibSqlNode } from "@prisma/adapter-libsql";
import { PrismaLibSql as PrismaLibSqlWeb } from "@prisma/adapter-libsql/web";
import { cloudflareLibsqlFetch } from "./libsql-fetch";
import { getDatabaseRuntimeConfig, isHostedRuntime } from "./runtime-env";

const databaseConfig = getDatabaseRuntimeConfig();
const hostedRuntime = isHostedRuntime();
const PrismaLibSql = hostedRuntime ? PrismaLibSqlWeb : PrismaLibSqlNode;
const adapter = new PrismaLibSql({
  url: databaseConfig.url,
  authToken: databaseConfig.authToken,
  ...(hostedRuntime ? { fetch: cloudflareLibsqlFetch } : {}),
});

const prismaClientSingleton = () => {
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
