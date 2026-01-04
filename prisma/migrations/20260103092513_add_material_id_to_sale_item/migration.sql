-- AlterTable
ALTER TABLE `saleitem` ADD COLUMN `materialId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `SaleItem_materialId_idx` ON `SaleItem`(`materialId`);

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `saleitem` RENAME INDEX `SaleItem_productId_fkey` TO `SaleItem_productId_idx`;
