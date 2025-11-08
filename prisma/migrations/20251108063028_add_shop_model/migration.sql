/*
  Warnings:

  - You are about to drop the column `storeId` on the `sale` table. All the data in the column will be lost.
  - You are about to drop the column `storeId` on the `salereturn` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `sale` DROP FOREIGN KEY `Sale_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `salereturn` DROP FOREIGN KEY `SaleReturn_storeId_fkey`;

-- DropIndex
DROP INDEX `Sale_storeId_idx` ON `sale`;

-- DropIndex
DROP INDEX `SaleReturn_storeId_fkey` ON `salereturn`;

-- AlterTable
ALTER TABLE `sale` DROP COLUMN `storeId`;

-- AlterTable
ALTER TABLE `salereturn` DROP COLUMN `storeId`;
