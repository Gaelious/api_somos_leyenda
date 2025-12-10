/*
  Warnings:

  - Added the required column `description` to the `nft` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUri` to the `nft` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "nft" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "imageUri" TEXT NOT NULL;
