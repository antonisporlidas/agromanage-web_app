/*
  Warnings:

  - Added the required column `cropCycleId` to the `SettlementItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DispatchNote" DROP CONSTRAINT "DispatchNote_cropCycleId_fkey";

-- AlterTable
ALTER TABLE "DispatchNote" ALTER COLUMN "cropCycleId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SettlementItem" ADD COLUMN     "cropCycleId" TEXT;

-- AddForeignKey
ALTER TABLE "DispatchNote" ADD CONSTRAINT "DispatchNote_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "CropCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "CropCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
