/*
  Warnings:

  - The values [FERTILIZER,PESTICIDE,SEEDS] on the enum `ExpenseCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ExpenseCategory_new" AS ENUM ('SEEDS_PLANTS', 'FERTILIZERS', 'PESTICIDES', 'LABOR', 'FUEL', 'IRRIGATION', 'EQUIPMENT', 'OTHER');
ALTER TABLE "Expense" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Expense" ALTER COLUMN "category" TYPE "ExpenseCategory_new" USING ("category"::text::"ExpenseCategory_new");
ALTER TYPE "ExpenseCategory" RENAME TO "ExpenseCategory_old";
ALTER TYPE "ExpenseCategory_new" RENAME TO "ExpenseCategory";
DROP TYPE "ExpenseCategory_old";
ALTER TABLE "Expense" ALTER COLUMN "category" SET DEFAULT 'OTHER';
COMMIT;

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "year" INTEGER;
