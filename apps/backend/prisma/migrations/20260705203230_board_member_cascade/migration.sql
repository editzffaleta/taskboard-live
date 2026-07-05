-- DropForeignKey
ALTER TABLE "board_members" DROP CONSTRAINT "board_members_boardId_fkey";

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
