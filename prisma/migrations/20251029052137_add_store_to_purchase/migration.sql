-- AlterTable
ALTER TABLE `purchase` ADD COLUMN `storeId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
