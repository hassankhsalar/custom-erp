-- CreateTable
CREATE TABLE `ProductionMaterial` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productionId` INTEGER NOT NULL,
    `materialId` INTEGER NOT NULL,
    `storeId` INTEGER NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `price` DOUBLE NOT NULL,

    UNIQUE INDEX `ProductionMaterial_productionId_materialId_storeId_key`(`productionId`, `materialId`, `storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductionMaterial` ADD CONSTRAINT `ProductionMaterial_productionId_fkey` FOREIGN KEY (`productionId`) REFERENCES `Production`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionMaterial` ADD CONSTRAINT `ProductionMaterial_materialId_fkey` FOREIGN KEY (`materialId`) REFERENCES `Material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionMaterial` ADD CONSTRAINT `ProductionMaterial_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
