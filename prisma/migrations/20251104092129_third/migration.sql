/*
  Warnings:

  - You are about to drop the column `wallet_address` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "wallet_address",
ADD COLUMN     "walletAddress" TEXT;
