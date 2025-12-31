-- CreateTable
CREATE TABLE `FactoryProduct` (
    `factoryId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `stock` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`factoryId`, `productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FactoryMaterial` (
    `factoryId` INTEGER NOT NULL,
    `materialId` INTEGER NOT NULL,
    `stock` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`factoryId`, `materialId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FactoryProduct` ADD CONSTRAINT `FactoryProduct_factoryId_fkey` FOREIGN KEY (`factoryId`) REFERENCES `Factory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FactoryProduct` ADD CONSTRAINT `FactoryProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FactoryMaterial` ADD CONSTRAINT `FactoryMaterial_factoryId_fkey` FOREIGN KEY (`factoryId`) REFERENCES `Factory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FactoryMaterial` ADD CONSTRAINT `FactoryMaterial_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
