/*
  Warnings:

  - Added the required column `userId` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ExpenseCategory" ADD VALUE 'SEEDS';

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_cropCycleId_fkey";

-- AlterTable
ALTER TABLE "CropCycle" ADD COLUMN     "year" INTEGER NOT NULL DEFAULT 2026;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "fieldId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "cropCycleId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_cropCycleId_fkey" FOREIGN KEY ("cropCycleId") REFERENCES "CropCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
