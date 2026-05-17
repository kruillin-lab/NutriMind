import path from "node:path";
import { defineConfig } from "@prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const isTurso =
  process.env.DATABASE_URL?.startsWith("libsql://") ||
  process.env.DATABASE_URL?.startsWith("https://");

const config: Parameters<typeof defineConfig>[0] = {
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: "./prisma/migrations",
  },
};

if (isTurso) {
  // @ts-expect-error adapter is supported at runtime in Prisma 7
  config.adapter = async () =>
    new PrismaLibSql(
      createClient({
        url: process.env.DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
    );
} else {
  config.datasource = {
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  };
}

export default defineConfig(config);
