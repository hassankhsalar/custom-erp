-- AlterTable
ALTER TABLE `production` ADD COLUMN `end_date` DATETIME(3) NULL,
    ADD COLUMN `materials_from` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Store` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `store_keeper` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,

    UNIQUE INDEX `Store_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreMaterial` (
    `store_id` INTEGER NOT NULL,
    `material_id` INTEGER NOT NULL,
    `stock` DOUBLE NOT NULL,

    PRIMARY KEY (`store_id`, `material_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoreProduct` (
    `store_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `stock` DOUBLE NOT NULL,

    PRIMARY KEY (`store_id`, `product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StoreMaterial` ADD CONSTRAINT `StoreMaterial_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `Store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreMaterial` ADD CONSTRAINT `StoreMaterial_material_id_fkey` FOREIGN KEY (`material_id`) REFERENCES `Material`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreProduct` ADD CONSTRAINT `StoreProduct_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `Store`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoreProduct` ADD CONSTRAINT `StoreProduct_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
