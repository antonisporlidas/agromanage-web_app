-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dispatchNoteId" TEXT;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dispatchNoteId_fkey" FOREIGN KEY ("dispatchNoteId") REFERENCES "DispatchNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
