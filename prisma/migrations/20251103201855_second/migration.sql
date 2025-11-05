/*
  Warnings:

  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `nft` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."nft" DROP CONSTRAINT "nft_owner_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "created_at";

-- DropTable
DROP TABLE "public"."nft";
