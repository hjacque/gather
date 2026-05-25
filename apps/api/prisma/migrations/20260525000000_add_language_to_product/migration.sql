-- CreateEnum
CREATE TYPE "Language" AS ENUM ('japanese', 'korean');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "languages" "Language"[] NOT NULL DEFAULT ARRAY[]::"Language"[];
