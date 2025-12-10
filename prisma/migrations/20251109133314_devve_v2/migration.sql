/*
  Warnings:

  - You are about to drop the column `walletAddress` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "walletAddress",
ADD COLUMN     "wallet" TEXT;
