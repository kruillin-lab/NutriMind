import { PrismaClient as PrismaClientWorkerd } from "@/src/generated/prisma/client";
import { PrismaClient as PrismaClientNode } from "@/src/generated/prisma-node/client";
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

// The workerd client's wasm loading path fails under next dev on Node
// (Prisma #28105); local runs use the nodejs-runtime client, hosted
// Sites builds keep the workerd one.
const prismaClientSingleton = (): PrismaClientWorkerd => {
  if (hostedRuntime) {
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
