-- DropForeignKey
ALTER TABLE `sale` DROP FOREIGN KEY `Sale_storeId_fkey`;

-- AlterTable
ALTER TABLE `sale` MODIFY `storeId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `sale` ADD CONSTRAINT `Sale_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
