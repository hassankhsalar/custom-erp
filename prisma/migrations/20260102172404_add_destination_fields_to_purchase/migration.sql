-- AlterTable
ALTER TABLE `purchase` ADD COLUMN `destinationId` INTEGER NULL,
    ADD COLUMN `destinationType` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Purchase_destinationType_idx` ON `Purchase`(`destinationType`);

-- CreateIndex
CREATE INDEX `Purchase_destinationId_idx` ON `Purchase`(`destinationId`);
