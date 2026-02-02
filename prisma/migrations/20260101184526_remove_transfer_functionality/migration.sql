/*
  Warnings:

  - You are about to drop the column `moved_to_store` on the `productionproducts` table. All the data in the column will be lost.
  - You are about to drop the `factorytostoretransfer` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `factorytostoretransfer` DROP FOREIGN KEY `FactoryToStoreTransfer_productId_fkey`;

-- DropForeignKey
ALTER TABLE `factorytostoretransfer` DROP FOREIGN KEY `FactoryToStoreTransfer_productionId_fkey`;

-- DropForeignKey
ALTER TABLE `factorytostoretransfer` DROP FOREIGN KEY `FactoryToStoreTransfer_storeId_fkey`;

-- AlterTable
ALTER TABLE `productionproducts` DROP COLUMN `moved_to_store`;

-- DropTable
DROP TABLE `factorytostoretransfer`;
