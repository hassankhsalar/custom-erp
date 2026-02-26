function registerShopSaleWarrantyRoutes({ router, prisma }) {
  router.get("/warranties", async (req, res) => {
    try {
      const { status, mobile, serial, customer, item, itemType, expiryFrom, expiryTo, page = 1, limit = 20 } = req.query;
      const where = {};
      where.status = { not: "deleted" };
      if (status) where.status = String(status);
      if (serial) where.serialNumber = { contains: String(serial) };
      if (customer) {
        where.customer = {
          ...(where.customer || {}),
          name: { contains: String(customer) }
        };
      }
      if (mobile) {
        where.customer = {
          ...(where.customer || {}),
          mobile: { contains: String(mobile) }
        };
      }
      if (itemType === "product") {
        where.product = { name: { contains: String(item || "") } };
      } else if (itemType === "material") {
        where.material = { name: { contains: String(item || "") } };
      } else if (item) {
        where.OR = [
          { product: { name: { contains: String(item) } } },
          { material: { name: { contains: String(item) } } },
        ];
      }
      if (expiryFrom || expiryTo) {
        where.endDate = {};
        if (expiryFrom) where.endDate.gte = new Date(expiryFrom);
        if (expiryTo) where.endDate.lte = new Date(expiryTo);
      }

      const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const take = parseInt(limit, 10);

      const [rows, total] = await prisma.$transaction([
        prisma.userWarranty.findMany({
          where,
          include: {
            product: { select: { id: true, name: true, barcode: true } },
            material: { select: { id: true, name: true, barcode: true } },
            customer: { select: { id: true, name: true, mobile: true } },
            sale: { select: { id: true, reference: true, createdAt: true } },
            saleItem: { select: { id: true, quantity: true, unitPrice: true } },
            claims: {
              orderBy: { createdAt: "desc" },
              take: 1,
            }
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.userWarranty.count({ where }),
      ]);

      res.json({ data: rows, total, page: parseInt(page, 10), limit: take });
    } catch (error) {
      console.error("Warranty list error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch warranties" });
    }
  });

  router.put("/warranties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { notes, endDate, status } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Invalid id" });
      }
      const updated = await prisma.userWarranty.update({
        where: { id },
        data: {
          notes: notes !== undefined ? String(notes || "") : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          status: status ? String(status) : undefined,
        },
      });
      res.json(updated);
    } catch (error) {
      console.error("Warranty edit error:", error);
      res.status(500).json({ error: error.message || "Failed to update warranty" });
    }
  });

  router.get("/warranties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const warranty = await prisma.userWarranty.findUnique({
        where: { id },
        include: {
          product: { select: { id: true, name: true, barcode: true, category: true } },
          material: { select: { id: true, name: true, barcode: true, unit: true, brand: true } },
          customer: { select: { id: true, name: true, mobile: true, email: true, address: true } },
          sale: { select: { id: true, reference: true, createdAt: true, shopId: true, paymentType: true, grandTotal: true } },
          saleItem: { select: { id: true, quantity: true, unitPrice: true, totalPrice: true, batchNumber: true, expiryDate: true } },
          claims: {
            orderBy: { createdAt: "desc" }
          }
        }
      });

      if (!warranty) {
        return res.status(404).json({ error: "Warranty not found" });
      }

      res.json(warranty);
    } catch (error) {
      console.error("Warranty details error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch warranty details" });
    }
  });

  router.delete("/warranties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) {
        return res.status(400).json({ error: "Invalid id" });
      }
      await prisma.userWarranty.update({
        where: { id },
        data: { status: "deleted", voidedAt: new Date() },
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Warranty delete error:", error);
      res.status(500).json({ error: error.message || "Failed to delete warranty" });
    }
  });

  router.post("/warranties/:id/claims", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { receivingDate, providingDate, issueDescription, resolution, status = "received", note } = req.body;
      if (!id || !receivingDate) {
        return res.status(400).json({ error: "warranty id and receivingDate are required" });
      }
      const warranty = await prisma.userWarranty.findUnique({ where: { id } });
      if (!warranty) {
        return res.status(404).json({ error: "Warranty not found" });
      }

      const latestClaim = await prisma.warrantyClaim.findFirst({
        where: { warrantyId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
      });
      const closedStatuses = new Set(["hand_over", "handover", "completed", "closed", "resolved"]);
      if (latestClaim && !closedStatuses.has(String(latestClaim.status || "").toLowerCase())) {
        return res.status(400).json({
          error: "Previous claim is still open. Please hand over/close it before creating a new claim.",
        });
      }

      const claim = await prisma.$transaction(async (tx) => {
        const created = await tx.warrantyClaim.create({
          data: {
            warrantyId: id,
            receivingDate: new Date(receivingDate),
            providingDate: providingDate ? new Date(providingDate) : null,
            issueDescription: issueDescription || null,
            resolution: resolution || null,
            status: String(status),
            note: note || null,
          },
        });

        await tx.userWarranty.update({
          where: { id },
          data: {
            status: "claimed",
            claimedAt: new Date(),
            claimCount: { increment: 1 },
          },
        });

        return created;
      });

      res.status(201).json(claim);
    } catch (error) {
      console.error("Warranty claim create error:", error);
      res.status(500).json({ error: error.message || "Failed to create warranty claim" });
    }
  });

  router.put("/warranties/:warrantyId/claims/:claimId", async (req, res) => {
    try {
      const warrantyId = parseInt(req.params.warrantyId, 10);
      const claimId = parseInt(req.params.claimId, 10);
      const { status, issueDescription, resolution, note, providingDate } = req.body;

      if (!warrantyId || !claimId || !status) {
        return res.status(400).json({ error: "warrantyId, claimId and status are required" });
      }

      const existing = await prisma.warrantyClaim.findFirst({
        where: { id: claimId, warrantyId },
        select: { id: true, warrantyId: true, status: true, providingDate: true },
      });
      if (!existing) {
        return res.status(404).json({ error: "Claim not found" });
      }

      const normalizedStatus = String(status).trim().toLowerCase();
      const handOverStatuses = new Set(["hand_over", "handover", "completed", "closed", "resolved"]);
      const shouldSetProvidingDate = handOverStatuses.has(normalizedStatus);

      const updatedClaim = await prisma.$transaction(async (tx) => {
        const updated = await tx.warrantyClaim.update({
          where: { id: claimId },
          data: {
            status: normalizedStatus,
            issueDescription: issueDescription !== undefined ? (issueDescription || null) : undefined,
            resolution: resolution !== undefined ? (resolution || null) : undefined,
            note: note !== undefined ? (note || null) : undefined,
            providingDate:
              providingDate
                ? new Date(providingDate)
                : shouldSetProvidingDate
                  ? (existing.providingDate || new Date())
                  : undefined,
          },
        });

        await tx.userWarranty.update({
          where: { id: warrantyId },
          data: {
            status: shouldSetProvidingDate ? "active" : "claimed",
            claimedAt: shouldSetProvidingDate ? undefined : new Date(),
          },
        });

        return updated;
      });

      res.json(updatedClaim);
    } catch (error) {
      console.error("Warranty claim update error:", error);
      res.status(500).json({ error: error.message || "Failed to update warranty claim" });
    }
  });

  router.put("/warranties/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, notes } = req.body;
      if (!id || !status) {
        return res.status(400).json({ error: "id and status are required" });
      }
      const allowed = ["active", "claimed", "expired", "void"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Allowed: ${allowed.join(", ")}` });
      }

      const updated = await prisma.userWarranty.update({
        where: { id },
        data: {
          status,
          notes: notes !== undefined ? String(notes || "") : undefined,
          claimedAt: status === "claimed" ? new Date() : undefined,
          voidedAt: status === "void" ? new Date() : undefined,
          claimCount: status === "claimed" ? { increment: 1 } : undefined,
        },
      });
      res.json(updated);
    } catch (error) {
      console.error("Warranty status update error:", error);
      res.status(500).json({ error: error.message || "Failed to update warranty status" });
    }
  });
}

module.exports = { registerShopSaleWarrantyRoutes };
