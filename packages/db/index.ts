import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = (process.env.NODE_ENV === "test" && process.env.TEST_DATABASE_URL)
  ? process.env.TEST_DATABASE_URL
  : process.env.DATABASE_URL!;

const adapter = new PrismaPg({
  connectionString,
});

export const prisma = new PrismaClient({
  adapter,
});