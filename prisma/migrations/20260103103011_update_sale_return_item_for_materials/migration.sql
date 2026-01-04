-- DropForeignKey
ALTER TABLE `salereturnitem` DROP FOREIGN KEY `SaleReturnItem_productId_fkey`;

-- DropIndex
DROP INDEX `SaleReturnItem_productId_fkey` ON `salereturnitem`;

-- AlterTable
ALTER TABLE `salereturnitem` ADD COLUMN `materialId` INTEGER NULL,
    MODIFY `productId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `SaleReturnItem` ADD CONSTRAINT `SaleReturnItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleReturnItem` ADD CONSTRAINT `SaleReturnItem_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
