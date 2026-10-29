-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'PARTIALLY_SETTLED', 'SETTLED');

-- DropIndex
DROP INDEX "Settlement_dispatchNoteId_key";

-- AlterTable
ALTER TABLE "DispatchNote" ADD COLUMN     "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Settlement" ALTER COLUMN "totalAmount" SET DEFAULT 0.0,
ALTER COLUMN "totalQuantityKg" SET DEFAULT 0.0;
