-- AlterTable
ALTER TABLE `productionmaterial` ADD COLUMN `scrap` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `productionproducts` ADD COLUMN `received` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `scrap` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `FactoryToStoreTransfer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `productionId` INTEGER NOT NULL,
    `storeId` INTEGER NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FactoryToStoreTransfer` ADD CONSTRAINT `FactoryToStoreTransfer_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FactoryToStoreTransfer` ADD CONSTRAINT `FactoryToStoreTransfer_productionId_fkey` FOREIGN KEY (`productionId`) REFERENCES `Production`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FactoryToStoreTransfer` ADD CONSTRAINT `FactoryToStoreTransfer_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
