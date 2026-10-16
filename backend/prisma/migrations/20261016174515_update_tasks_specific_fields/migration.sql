/*
  Warnings:

  - You are about to drop the column `description` on the `Task` table. All the data in the column will be lost.
  - Added the required column `taskType` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('PLANTING', 'FERTILIZATION', 'SPRAYING', 'HARVEST', 'SHREDDING');

-- CreateEnum
CREATE TYPE "HarvestQualityGrade" AS ENUM ('GRADE_A', 'GRADE_B');

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "description",
ADD COLUMN     "dosageUnit" TEXT,
ADD COLUMN     "harvestQuantityKg" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "qualityGrade" "HarvestQualityGrade",
ADD COLUMN     "quantityApplied" DOUBLE PRECISION,
ADD COLUMN     "taskType" "TaskType" NOT NULL,
ALTER COLUMN "title" DROP NOT NULL;
