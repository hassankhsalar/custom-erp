function registerSaleEditAccessRoutes({
  router,
  prisma,
  buildScope,
  ensureIdScope,
  getRequesterAccessContext,
  createNotification,
  normalizeEditGrantLimits,
  buildEditGrantUpdateData,
}) {
  // Open sale for edit to a specific user (one user at a time)
  router.post("/:id/edit-access/open", async (req, res) => {
    try {
      const saleId = parseInt(req.params.id, 10);
      const targetUserId = parseInt(req.body?.userId, 10);
      if (!saleId || !targetUserId) {
        return res.status(400).json({ error: "sale id and userId are required" });
      }

      const sale = await prisma.sale.findUnique({ where: { id: saleId } });
      if (!sale) return res.status(404).json({ error: "Sale not found" });

      const scope = await buildScope(prisma, req.user?.userId || 0);
      ensureIdScope(scope, "shop", sale.shopId);

      const access = await getRequesterAccessContext(req.user?.userId || 0);
      if (!access.canGrantSaleEdit) {
        return res.status(403).json({ error: "You do not have permission to open sale edit access" });
      }

      if ((sale.editStatus || "closed") === "open" && Number(sale.editGrantedToUserId || 0) !== targetUserId) {
        return res.status(409).json({
          error: `Sale is already open for another user (userId: ${sale.editGrantedToUserId}). Close it first.`,
        });
      }

      const { maxEditCount, accessDurationMinutes } = normalizeEditGrantLimits(req.body || {});
      const openedAt = new Date();
      const updated = await prisma.sale.update({
        where: { id: saleId },
        data: buildEditGrantUpdateData({
          targetUserId,
          grantedByUserId: req.user?.userId || null,
          maxEditCount,
          accessDurationMinutes,
          openedAt,
        }),
      });

      return res.json({ success: true, sale: updated });
    } catch (err) {
      if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
      return res.status(500).json({ error: err.message });
    }
  });

  // Request sale edit access (for users without direct grant rights)
  router.post("/:id/edit-access/request", async (req, res) => {
    try {
      const saleId = parseInt(req.params.id, 10);
      if (!saleId) {
        return res.status(400).json({ error: "Invalid sale ID" });
      }

      const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          shop: { select: { id: true, name: true } },
        },
      });
      if (!sale) return res.status(404).json({ error: "Sale not found" });

      const scope = await buildScope(prisma, req.user?.userId || 0);
      ensureIdScope(scope, "shop", sale.shopId);

      const requester = await prisma.user.findUnique({
        where: { id: req.user?.userId || 0 },
        select: { id: true, name: true, username: true, email: true },
      });

      const existingPending = await prisma.saleEditAccessRequest.findFirst({
        where: {
          saleId,
          requesterUserId: req.user?.userId || 0,
          status: "pending",
        },
        select: { id: true },
      });
      if (existingPending) {
        return res.status(409).json({ error: "You already have a pending request for this sale." });
      }

      const requestRow = await prisma.saleEditAccessRequest.create({
        data: {
          saleId,
          requesterUserId: req.user?.userId || 0,
          status: "pending",
        },
      });

      await createNotification(prisma, {
        title: `Edit access request for sale ${sale.reference}`,
        description: `User ${requester?.name || requester?.username || requester?.email || req.user?.userId} requested edit access for sale ${sale.reference} at ${sale.shop?.name || "shop"}. Request ID: ${requestRow.id}`,
        forRole: "admin",
        link: "/sale/edit-requests",
      });

      return res.json({ success: true, message: "Edit access request sent to admin." });
    } catch (err) {
      if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
      return res.status(500).json({ error: err.message });
    }
  });

  // List sale edit access requests
  router.get("/edit-access/requests", async (req, res) => {
    try {
      const status = String(req.query.status || "pending").toLowerCase();
      const allowedStatuses = new Set(["pending", "approved", "rejected", "all"]);
      if (!allowedStatuses.has(status)) {
        return res.status(400).json({ error: "Invalid status filter" });
      }

      const access = await getRequesterAccessContext(req.user?.userId || 0);
      if (!access.canGrantSaleEdit) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const scope = await buildScope(prisma, req.user?.userId || 0);
      const saleWhere = scope.isAdmin ? {} : { shopId: { in: Array.from(scope.shops) } };
      const allowedSales = await prisma.sale.findMany({
        where: saleWhere,
        select: { id: true },
      });
      const allowedSaleIds = allowedSales.map((s) => s.id);

      if (allowedSaleIds.length === 0) {
        return res.json({ rows: [] });
      }

      const where = {
        saleId: { in: allowedSaleIds },
        ...(status === "all" ? {} : { status }),
      };

      const rows = await prisma.saleEditAccessRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          sale: {
            select: {
              id: true,
              reference: true,
              shopId: true,
              editStatus: true,
              editGrantedToUserId: true,
              editMaxCount: true,
              editUsedCount: true,
              editAccessDurationMinutes: true,
              editExpiresAt: true,
              transactionStatus: true,
              createdAt: true,
              shop: { select: { id: true, name: true } },
            },
          },
        },
      });

      const requesterIds = Array.from(new Set(rows.map((r) => r.requesterUserId).filter(Boolean)));
      const resolverIds = Array.from(new Set(rows.map((r) => r.resolvedByUserId).filter(Boolean)));
      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(new Set([...requesterIds, ...resolverIds])) } },
        select: { id: true, name: true, username: true, email: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      const enriched = rows.map((row) => ({
        ...row,
        requester: userMap.get(row.requesterUserId) || null,
        resolvedBy: row.resolvedByUserId ? (userMap.get(row.resolvedByUserId) || null) : null,
      }));

      return res.json({ rows: enriched });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Approve sale edit request and open access for requested user
  router.post("/edit-access/requests/:requestId/approve", async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId, 10);
      if (!requestId) return res.status(400).json({ error: "Invalid request ID" });

      const access = await getRequesterAccessContext(req.user?.userId || 0);
      if (!access.canGrantSaleEdit) return res.status(403).json({ error: "Forbidden" });

      const requestRow = await prisma.saleEditAccessRequest.findUnique({ where: { id: requestId } });
      if (!requestRow) return res.status(404).json({ error: "Request not found" });
      if (requestRow.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

      const sale = await prisma.sale.findUnique({ where: { id: requestRow.saleId } });
      if (!sale) return res.status(404).json({ error: "Sale not found" });

      const scope = await buildScope(prisma, req.user?.userId || 0);
      ensureIdScope(scope, "shop", sale.shopId);

      if ((sale.editStatus || "closed") === "open" && Number(sale.editGrantedToUserId || 0) !== Number(requestRow.requesterUserId)) {
        return res.status(409).json({ error: "Sale is already open for another user. Close it first." });
      }

      const { maxEditCount, accessDurationMinutes } = normalizeEditGrantLimits(req.body || {});
      const openedAt = new Date();
      await prisma.$transaction(async (tx) => {
        await tx.sale.update({
          where: { id: sale.id },
          data: buildEditGrantUpdateData({
            targetUserId: requestRow.requesterUserId,
            grantedByUserId: req.user?.userId || null,
            maxEditCount,
            accessDurationMinutes,
            openedAt,
          }),
        });

        await tx.saleEditAccessRequest.update({
          where: { id: requestId },
          data: {
            status: "approved",
            resolvedByUserId: req.user?.userId || null,
            resolvedAt: new Date(),
          },
        });
      });

      await createNotification(prisma, {
        title: `Edit access approved for sale ${sale.reference}`,
        description: `Your request to edit sale ${sale.reference} was approved.`,
        forRole: "admin",
        link: "/sale/all",
      });

      return res.json({ success: true });
    } catch (err) {
      if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
      return res.status(500).json({ error: err.message });
    }
  });

  // Reject sale edit request
  router.post("/edit-access/requests/:requestId/reject", async (req, res) => {
    try {
      const requestId = parseInt(req.params.requestId, 10);
      if (!requestId) return res.status(400).json({ error: "Invalid request ID" });

      const access = await getRequesterAccessContext(req.user?.userId || 0);
      if (!access.canGrantSaleEdit) return res.status(403).json({ error: "Forbidden" });

      const requestRow = await prisma.saleEditAccessRequest.findUnique({ where: { id: requestId } });
      if (!requestRow) return res.status(404).json({ error: "Request not found" });
      if (requestRow.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

      const sale = await prisma.sale.findUnique({ where: { id: requestRow.saleId } });
      if (!sale) return res.status(404).json({ error: "Sale not found" });

      const scope = await buildScope(prisma, req.user?.userId || 0);
      ensureIdScope(scope, "shop", sale.shopId);

      await prisma.saleEditAccessRequest.update({
        where: { id: requestId },
        data: {
          status: "rejected",
          resolvedByUserId: req.user?.userId || null,
          resolvedAt: new Date(),
        },
      });

      return res.json({ success: true });
    } catch (err) {
      if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
      return res.status(500).json({ error: err.message });
    }
  });

  // Close sale edit access
  router.post("/:id/edit-access/close", async (req, res) => {
    try {
      const saleId = parseInt(req.params.id, 10);
      if (!saleId) return res.status(400).json({ error: "Invalid sale ID" });

      const sale = await prisma.sale.findUnique({ where: { id: saleId } });
      if (!sale) return res.status(404).json({ error: "Sale not found" });

      const scope = await buildScope(prisma, req.user?.userId || 0);
      ensureIdScope(scope, "shop", sale.shopId);

      const access = await getRequesterAccessContext(req.user?.userId || 0);
      const isGrantedUser = Number(sale.editGrantedToUserId || 0) === Number(req.user?.userId || 0);
      if (!access.canGrantSaleEdit && !isGrantedUser) {
        return res.status(403).json({ error: "You do not have permission to close sale edit access" });
      }

      const updated = await prisma.sale.update({
        where: { id: saleId },
        data: {
          editStatus: "closed",
          editClosedAt: new Date(),
        },
      });

      return res.json({ success: true, sale: updated });
    } catch (err) {
      if (err.status === 403) return res.status(403).json({ error: "Forbidden" });
      return res.status(500).json({ error: err.message });
    }
  });
}

module.exports = {
  registerSaleEditAccessRoutes,
};
