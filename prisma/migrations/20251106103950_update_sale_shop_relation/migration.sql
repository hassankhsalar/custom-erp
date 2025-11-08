-- RenameIndex
ALTER TABLE `sale` RENAME INDEX `Sale_shopId_fkey` TO `Sale_shopId_idx`;

-- RenameIndex
ALTER TABLE `sale` RENAME INDEX `Sale_storeId_fkey` TO `Sale_storeId_idx`;
