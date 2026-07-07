-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lists" ADD COLUMN     "archivedAt" TIMESTAMP(3);
