-- CreateTable
CREATE TABLE `StoreToShopTransfer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reference` VARCHAR(191) NOT NULL,
    `storeId` INTEGER NOT NULL,
    `shopId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `totalItems` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StoreToShopTransfer_reference_key`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreToShopTransferItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transferId` INTEGER NOT NULL,
    `productId` INTEGER NULL,
    `materialId` INTEGER NULL,
    `quantity` DOUBLE NOT NULL,
    `type` VARCHAR(191) NOT NULL,

    INDEX `StoreToShopTransferItem_transferId_idx`(`transferId`),
    INDEX `StoreToShopTransferItem_productId_idx`(`productId`),
    INDEX `StoreToShopTransferItem_materialId_idx`(`materialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StoreToShopTransfer` ADD CONSTRAINT `StoreToShopTransfer_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreToShopTransfer` ADD CONSTRAINT `StoreToShopTransfer_shopId_fkey` FOREIGN KEY (`shopId`) REFERENCES `Shop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreToShopTransferItem` ADD CONSTRAINT `StoreToShopTransferItem_transferId_fkey` FOREIGN KEY (`transferId`) REFERENCES `StoreToShopTransfer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreToShopTransferItem` ADD CONSTRAINT `StoreToShopTransferItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreToShopTransferItem` ADD CONSTRAINT `StoreToShopTransferItem_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
