-- AlterTable
ALTER TABLE "users" ADD COLUMN     "devveAccessToken" TEXT,
ADD COLUMN     "devveRefreshToken" TEXT,
ADD COLUMN     "devveTokenExpiresAt" INTEGER;
