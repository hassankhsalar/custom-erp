-- AlterTable
ALTER TABLE `sale` ADD COLUMN `isReturned` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `returnedAt` DATETIME(3) NULL;
