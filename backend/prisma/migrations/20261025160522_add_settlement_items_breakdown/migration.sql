/*
  Warnings:

  - You are about to drop the column `pricePerKg` on the `Settlement` table. All the data in the column will be lost.
  - Added the required column `totalQuantityKg` to the `Settlement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Settlement" DROP COLUMN "pricePerKg",
ADD COLUMN     "totalQuantityKg" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "SettlementItem" (
    "id" TEXT NOT NULL,
    "grade" TEXT,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "pricePerKg" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "settlementId" TEXT NOT NULL,

    CONSTRAINT "SettlementItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
