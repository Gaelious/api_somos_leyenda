-- CreateTable
CREATE TABLE "nft" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetUri" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "level" INTEGER,

    CONSTRAINT "nft_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "nft" ADD CONSTRAINT "nft_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
