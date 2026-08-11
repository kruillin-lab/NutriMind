import { PrismaClient as PrismaClientWorkerd } from "@/src/generated/prisma/client";
import { PrismaClient as PrismaClientNode } from "@/src/generated/prisma-node/client";
import { PrismaLibSql as PrismaLibSqlNode } from "@prisma/adapter-libsql";
import { PrismaLibSql as PrismaLibSqlWeb } from "@prisma/adapter-libsql/web";
import { cloudflareLibsqlFetch } from "./libsql-fetch";
import { getDatabaseRuntimeConfig, isWorkerdRuntime } from "./runtime-env";

const databaseConfig = getDatabaseRuntimeConfig();
const workerdRuntime = isWorkerdRuntime();
const PrismaLibSql = workerdRuntime ? PrismaLibSqlWeb : PrismaLibSqlNode;
const adapter = new PrismaLibSql({
  url: databaseConfig.url,
  authToken: databaseConfig.authToken,
  ...(workerdRuntime ? { fetch: cloudflareLibsqlFetch } : {}),
});

// Select the client for the JavaScript engine: Node uses the nodejs-runtime
// client, while Cloudflare Workers and local workerd use the workerd client.
const prismaClientSingleton = (): PrismaClientWorkerd => {
  if (workerdRuntime) {
    return new PrismaClientWorkerd({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
  }
  return new PrismaClientNode({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }) as PrismaClientWorkerd;
};

type PrismaClientSingleton = PrismaClientWorkerd;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
