const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();
const { generateMonthlySalaries } = require("../services/salaryCron");
const { createTransaction } = require("../utils/transactionHelper");
const { createNotification } = require("../utils/notificationHelper");
const { rollbackAndDeleteTransactionsByWhere } = require("../utils/transactionRollback");
const SALARY_STATUSES = ["generated", "created", "approve", "approved", "paid"];

const parsePositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseDateSafe = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const userHasPermission = async (userId, permission) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deleted_at: false },
    include: { permission: true },
  });
  if (!user || !user.permission) return false;
  if (["admin", "superadmin"].includes(user.permission.name)) return true;
  const perms = user.permission.permissions || [];
  return perms.includes(permission);
};

const isManagerOf = async (managerId, userId) => {
  const relation = await prisma.userManager.findFirst({
    where: { managerId, userId }
  });
  return !!relation;
};

// Search users by name, email, or username (with authentication)
router.get("/users/search", async (req, res) => {
  try {
    console.log('Search endpoint called with query:', req.query);
    
    const { query } = req.query;
    
    if (!query || query.trim().length < 1) {
      return res.json([]);
    }

    const searchQuery = query.trim();
    
    // SIMPLE search without complex conditions
    const users = await prisma.user.findMany({
      where: {
        deleted_at: false,
        OR: [
          { name: { contains: searchQuery } },
          { email: { contains: searchQuery } },
          { username: { contains: searchQuery } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true
      },
      take: 10
    });

    console.log('Search results:', users.length);
    res.json(users);
  } catch (err) {
    console.error('Search error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    
    // Return empty array instead of error for frontend compatibility
    res.json([]);
  }
});

// Alternative: Direct database query if Prisma is having issues
router.get("/users/search-simple", async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 1) {
      return res.json([]);
    }

    const searchQuery = `%${query.trim()}%`;
    
    // Using raw query as fallback
    const users = await prisma.$queryRaw`
      SELECT id, name, email, username
      FROM User
      WHERE name LIKE ${searchQuery}
         OR email LIKE ${searchQuery}
         OR username LIKE ${searchQuery}
      LIMIT 10
    `;

    res.json(users);
  } catch (err) {
    console.error('Raw search error:', err);
    res.json([]);
  }
});


// Get user's manager
router.get("/employees/:userId/manager", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const relation = await prisma.userManager.findFirst({
      where: { userId, isPrimary: true },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true
          }
        }
      }
    });

    if (!relation) {
      return res.json(null);
    }

    res.json(relation.manager);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Employees (profiles)
router.get("/employees", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { deleted_at: false },
      include: {
        employeeProfile: true,
        managerOf: { include: { user: true } },
        reportsTo: { include: { manager: true } }
      },
      orderBy: { id: "asc" }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alternative search endpoint for employees only
router.get("/employees/search", async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 1) {
      return res.json([]);
    }

    const searchQuery = query.trim();
    
    const users = await prisma.user.findMany({
      where: {
        deleted_at: false,
        OR: [
          { name: { contains: searchQuery } },
          { email: { contains: searchQuery } },
          { username: { contains: searchQuery } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true
      },
      take: 10
    });

    res.json(users);
  } catch (err) {
    console.error('Employee search error:', err);
    res.json([]);
  }
});


router.post("/employees", async (req, res) => {
  try {
    const { userId, designation, baseSalary, salaryType, joiningDate, status } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const profile = await prisma.employeeProfile.upsert({
      where: { userId: parseInt(userId) },
      create: {
        userId: parseInt(userId),
        designation: designation || null,
        baseSalary: parseFloat(baseSalary) || 0,
        salaryType: salaryType || "monthly",
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        status: status || "active"
      },
      update: {
        designation: designation || null,
        baseSalary: parseFloat(baseSalary) || 0,
        salaryType: salaryType || "monthly",
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        status: status || "active"
      }
    });

    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/employees/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { designation, baseSalary, salaryType, joiningDate, status } = req.body;
    const profile = await prisma.employeeProfile.update({
      where: { userId },
      data: {
        designation: designation || null,
        baseSalary: parseFloat(baseSalary) || 0,
        salaryType: salaryType || "monthly",
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        status: status || "active"
      }
    });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/employees/:userId/manager", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { managerId, isPrimary = true } = req.body;
    if (!managerId) return res.status(400).json({ error: "managerId is required" });

    const relation = await prisma.userManager.upsert({
      where: {
        userId_managerId: { userId, managerId: parseInt(managerId) }
      },
      create: { userId, managerId: parseInt(managerId), isPrimary: !!isPrimary },
      update: { isPrimary: !!isPrimary }
    });

    res.json(relation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clock in/out
router.post("/clock-in", async (req, res) => {
  try {
    const userId = req.user.userId;
    const open = await prisma.clockInOut.findFirst({
      where: { userId, status: "open" }
    });
    if (open) return res.status(400).json({ error: "Already clocked in" });

    const record = await prisma.clockInOut.create({
      data: { userId, clockIn: new Date(), status: "open" }
    });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/clock-out", async (req, res) => {
  try {
    const userId = req.user.userId;
    const open = await prisma.clockInOut.findFirst({
      where: { userId, status: "open" },
      orderBy: { clockIn: "desc" }
    });
    if (!open) return res.status(400).json({ error: "No active clock-in found" });

    const record = await prisma.clockInOut.update({
      where: { id: open.id },
      data: { clockOut: new Date(), status: "closed" }
    });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/clock-records", async (req, res) => {
  try {
    const { userId, startDate, endDate, search, status, sortBy, sortDir } = req.query;
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const skip = (page - 1) * limit;
    const requesterId = req.user.userId;
    const canViewAll = await userHasPermission(requesterId, "approve_clock_in_out") || await userHasPermission(requesterId, "clock_in_out_manage");

    const where = {};
    if (userId && (canViewAll || parseInt(userId, 10) === requesterId)) {
      where.userId = parseInt(userId, 10);
    } else if (!canViewAll) {
      where.userId = requesterId;
    }
    const parsedStart = parseDateSafe(startDate);
    const parsedEnd = parseDateSafe(endDate);
    if (parsedStart || parsedEnd) {
      where.clockIn = {};
      if (parsedStart) where.clockIn.gte = parsedStart;
      if (parsedEnd) where.clockIn.lte = parsedEnd;
    }
    const searchValue = String(search || "").trim();
    if (searchValue) {
      where.OR = [
        { user: { name: { contains: searchValue } } },
        { user: { email: { contains: searchValue } } },
        { user: { username: { contains: searchValue } } },
      ];
    }
    if (String(status || "").trim()) {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (normalizedStatus === "active") where.clockOut = null;
      else if (normalizedStatus === "closed") where.status = "closed";
      else where.status = normalizedStatus;
    }

    const allowedSortKeys = new Set(["clockIn", "clockOut", "status", "createdAt"]);
    const sortKey = allowedSortKeys.has(String(sortBy || "")) ? String(sortBy) : "clockIn";
    const direction = String(sortDir || "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const [items, totalCount, activeCount] = await Promise.all([
      prisma.clockInOut.findMany({
        where,
        include: { user: true, approvedBy: true },
        orderBy: { [sortKey]: direction },
        skip,
        take: limit,
      }),
      prisma.clockInOut.count({ where }),
      prisma.clockInOut.count({
        where: {
          ...where,
          clockOut: null,
        },
      }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
      meta: {
        activeCount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/employees/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ error: "Invalid userId" });
    const profile = await prisma.employeeProfile.findUnique({ where: { userId } });
    const managerLinks = await prisma.userManager.count({
      where: { OR: [{ userId }, { managerId: userId }] },
    });

    await prisma.$transaction(async (tx) => {
      await tx.userManager.deleteMany({
        where: {
          OR: [{ userId }, { managerId: userId }],
        },
      });
      await tx.employeeProfile.deleteMany({ where: { userId } });
    });
    const summary = {
      userId,
      designation: profile?.designation || null,
      baseSalary: profile?.baseSalary || null,
      managerLinksRemoved: managerLinks,
    };
    req.setAuditTrail?.({
      action: "delete",
      entity: "employee",
      entityId: userId,
      description: `Deleted employee profile for user #${userId} and removed ${managerLinks} manager links.`,
      details: summary,
    });

    res.json({ success: true, message: "Employee profile deleted successfully", summary });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to delete employee profile" });
  }
});

router.get("/clock-records/overview", async (req, res) => {
  try {
    const { userId, startDate, endDate, search, status } = req.query;
    const requesterId = req.user.userId;
    const canViewAll = await userHasPermission(requesterId, "approve_clock_in_out") || await userHasPermission(requesterId, "clock_in_out_manage");

    const where = {};
    if (userId && (canViewAll || parseInt(userId, 10) === requesterId)) {
      where.userId = parseInt(userId, 10);
    } else if (!canViewAll) {
      where.userId = requesterId;
    }
    const parsedStart = parseDateSafe(startDate);
    const parsedEnd = parseDateSafe(endDate);
    if (parsedStart || parsedEnd) {
      where.clockIn = {};
      if (parsedStart) where.clockIn.gte = parsedStart;
      if (parsedEnd) where.clockIn.lte = parsedEnd;
    }
    const searchValue = String(search || "").trim();
    if (searchValue) {
      where.OR = [
        { user: { name: { contains: searchValue } } },
        { user: { email: { contains: searchValue } } },
        { user: { username: { contains: searchValue } } },
      ];
    }
    if (String(status || "").trim()) {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (normalizedStatus === "active") where.clockOut = null;
      else if (normalizedStatus === "closed") where.status = "closed";
      else where.status = normalizedStatus;
    }

    const [totalCount, activeCount, uniqueUsersRaw, todayCount] = await Promise.all([
      prisma.clockInOut.count({ where }),
      prisma.clockInOut.count({
        where: {
          ...where,
          clockOut: null,
        },
      }),
      prisma.clockInOut.findMany({
        where,
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.clockInOut.count({
        where: {
          ...where,
          clockIn: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    res.json({
      totalCount,
      activeCount,
      uniqueUsers: uniqueUsersRaw.length,
      todayCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Holidays
router.get("/holidays", async (req, res) => {
  try {
    const holidays = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/holidays", async (req, res) => {
  try {
    const { name, date, isPaid, description } = req.body;
    const holiday = await prisma.holiday.create({
      data: {
        name,
        date: new Date(date),
        isPaid: isPaid !== undefined ? !!isPaid : true,
        description: description || null
      }
    });
    res.json(holiday);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/holidays/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, date, isPaid, description } = req.body;
    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        name,
        date: new Date(date),
        isPaid: isPaid !== undefined ? !!isPaid : true,
        description: description || null
      }
    });
    res.json(holiday);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/holidays/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.holiday.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//get Leave categories
router.get("/leave-categories", async (req, res) => {
  try {
    const categories = await prisma.leaveCategory.findMany({ where: { deleted_at: false }, orderBy: { name: "asc" } });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//create Leave categories
router.post("/leave-categories", async (req, res) => {
  try {
    const { name, isPaid, maxDays } = req.body;
    const category = await prisma.leaveCategory.create({
      data: {
        name,
        isPaid: isPaid !== undefined ? !!isPaid : true,
        maxDays: maxDays ? parseInt(maxDays) : null
      }
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//update Leave categories
router.put("/leave-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, isPaid, maxDays } = req.body;
    const category = await prisma.leaveCategory.update({
      where: { id },
      data: {
        name,
        isPaid: isPaid !== undefined ? !!isPaid : true,
        maxDays: maxDays ? parseInt(maxDays) : null
      }
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// delete Leave categories
router.delete("/leave-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.leaveCategory.update({ where: { id }, data: { deleted_at: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/leave-requests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: "Invalid leave request id" });

    const requesterId = req.user.userId;
    const canApproveAll = await userHasPermission(requesterId, "leave_approve_all");
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: "Leave request not found" });

    if (!canApproveAll && leave.userId !== requesterId) {
      const canApprove = await userHasPermission(requesterId, "leave_approve");
      if (!canApprove || !(await isManagerOf(requesterId, leave.userId))) {
        return res.status(403).json({ error: "Not authorized to delete this leave request" });
      }
    }

    await prisma.leaveRequest.delete({ where: { id } });
    const summary = {
      leaveRequestId: id,
      userId: leave.userId,
      categoryId: leave.categoryId,
      startDate: leave.startDate,
      endDate: leave.endDate,
      status: leave.status,
    };
    req.setAuditTrail?.({
      action: "delete",
      entity: "leave request",
      entityId: id,
      description: `Deleted leave request #${id} for user #${leave.userId} (${String(leave.status || "pending")}).`,
      details: summary,
    });
    res.json({ success: true, message: "Leave request deleted successfully", summary });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to delete leave request" });
  }
});

// Leave requests
router.post("/leave-requests", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { categoryId, startDate, endDate, reason } = req.body;
    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        categoryId: parseInt(categoryId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null
      }
    });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// get all Leave requests
router.get("/leave-requests", async (req, res) => {
  try {
    const requesterId = req.user.userId;
    const canApproveAll = await userHasPermission(requesterId, "leave_approve_all");
    const canApprove = await userHasPermission(requesterId, "leave_approve");

    let where = {};
    if (!canApproveAll) {
      if (canApprove) {
        const managedUsers = await prisma.userManager.findMany({
          where: { managerId: requesterId },
          select: { userId: true }
        });
        const ids = managedUsers.map(m => m.userId);
        where = { userId: { in: ids.length ? ids : [-1] } };
      } else {
        where = { userId: requesterId };
      }
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { user: true, category: true, approvals: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// update approved Leave requests
router.put("/leave-requests/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const approverId = req.user.userId;
    const canApproveAll = await userHasPermission(approverId, "leave_approve_all");
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!leave) return res.status(404).json({ error: "Leave request not found" });

    if (!canApproveAll) {
      const isManager = await isManagerOf(approverId, leave.userId);
      if (!isManager) return res.status(403).json({ error: "Not authorized to approve this leave" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const leaveReq = await tx.leaveRequest.update({
        where: { id },
        data: { status: "approved" }
      });
      await tx.leaveApproval.create({
        data: {
          leaveRequestId: id,
          approverId,
          status: "approved",
          note: req.body.note || null
        }
      });
      return leaveReq;
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// update reject Leave requests
router.put("/leave-requests/:id/reject", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const approverId = req.user.userId;
    const canApproveAll = await userHasPermission(approverId, "leave_approve_all");
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!leave) return res.status(404).json({ error: "Leave request not found" });

    if (!canApproveAll) {
      const isManager = await isManagerOf(approverId, leave.userId);
      if (!isManager) return res.status(403).json({ error: "Not authorized to reject this leave" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const leaveReq = await tx.leaveRequest.update({
        where: { id },
        data: { status: "rejected" }
      });
      await tx.leaveApproval.create({
        data: {
          leaveRequestId: id,
          approverId,
          status: "rejected",
          note: req.body.note || null
        }
      });
      return leaveReq;
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Payroll / Salaries
router.get("/payroll", async (req, res) => {
  try {
    const month = req.query.month ? parseInt(req.query.month) : null;
    const year = req.query.year ? parseInt(req.query.year) : null;
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
    const skip = (page - 1) * limit;
    const status = String(req.query.status || "").trim().toLowerCase();
    const search = String(req.query.search || "").trim();
    const sortBy = String(req.query.sortBy || "year");
    const sortDir = String(req.query.sortDir || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const dateFrom = parseDateSafe(req.query.dateFrom);
    const dateTo = parseDateSafe(req.query.dateTo);
    const where = {};
    if (month) where.month = month;
    if (year) where.year = year;
    if (status) where.status = status === "approved" ? "approve" : status;
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { user: { username: { contains: search } } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const allowedSort = new Set(["year", "month", "status", "gross", "net", "createdAt"]);
    const orderByKey = allowedSort.has(sortBy) ? sortBy : "year";
    const orderBy =
      orderByKey === "year"
        ? [{ year: sortDir }, { month: sortDir }]
        : [{ [orderByKey]: sortDir }, { year: "desc" }, { month: "desc" }];

    const [items, totalCount, aggregate] = await Promise.all([
      prisma.salary.findMany({
        where,
        include: { user: true },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.salary.count({ where }),
      prisma.salary.aggregate({
        where,
        _sum: { net: true, gross: true },
      }),
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
      totals: {
        totalNet: Number(aggregate._sum?.net || 0),
        totalGross: Number(aggregate._sum?.gross || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/payroll/overview", async (req, res) => {
  try {
    const month = req.query.month ? parseInt(req.query.month) : null;
    const year = req.query.year ? parseInt(req.query.year) : null;
    const status = String(req.query.status || "").trim().toLowerCase();
    const search = String(req.query.search || "").trim();
    const dateFrom = parseDateSafe(req.query.dateFrom);
    const dateTo = parseDateSafe(req.query.dateTo);
    const where = {};
    if (month) where.month = month;
    if (year) where.year = year;
    if (status) where.status = status === "approved" ? "approve" : status;
    if (search) {
      where.OR = [
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { user: { username: { contains: search } } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [totalCount, aggregate, byStatus] = await Promise.all([
      prisma.salary.count({ where }),
      prisma.salary.aggregate({
        where,
        _sum: { net: true },
        _avg: { net: true },
      }),
      prisma.salary.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
    ]);

    res.json({
      totalCount,
      totalPayroll: Number(aggregate._sum?.net || 0),
      averageSalary: Number(aggregate._avg?.net || 0),
      byStatus: byStatus.reduce((acc, row) => {
        acc[row.status || "unknown"] = Number(row._count?._all || 0);
        return acc;
      }, {}),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Update Payroll / Salaries
router.put("/payroll/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { allowances, deductions, status, accountId } = req.body;
    const normalizedStatus = status !== undefined && status !== null
      ? String(status).trim().toLowerCase()
      : undefined;
    if (normalizedStatus && !SALARY_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({ error: "Invalid salary status" });
    }
    const finalStatus = normalizedStatus === "approved" ? "approve" : normalizedStatus;

    const existingSalary = await prisma.salary.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!existingSalary) {
      return res.status(404).json({ error: "Salary not found" });
    }

    const existingStatus = (existingSalary.status || "").toLowerCase();
    if (existingStatus === "paid") {
      return res.status(400).json({ error: "Paid salary cannot be edited" });
    }

    if (finalStatus === "paid" && !["approve", "approved"].includes(existingStatus)) {
      return res.status(400).json({ error: "Salary must be approved before marking as paid" });
    }

    const parsedAccountId = accountId !== undefined && accountId !== null && String(accountId).trim() !== ""
      ? parseInt(accountId)
      : null;

    if (finalStatus === "paid" && !parsedAccountId) {
      return res.status(400).json({ error: "accountId is required when status is paid" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const nextAllowances = allowances !== undefined ? parseFloat(allowances) || 0 : (existingSalary.allowances || 0);
      const nextDeductions = deductions !== undefined ? parseFloat(deductions) || 0 : (existingSalary.deductions || 0);
      const nextGross = (existingSalary.baseSalary || 0) + nextAllowances;
      const nextNet = nextGross - nextDeductions;

      const updatedSalary = await tx.salary.update({
        where: { id },
        data: {
          allowances: allowances !== undefined ? nextAllowances : undefined,
          deductions: deductions !== undefined ? nextDeductions : undefined,
          status: finalStatus || undefined,
          gross: nextGross,
          net: nextNet
        },
        include: { user: true }
      });

      if (finalStatus === "paid") {
        const account = await tx.accounts.findUnique({ where: { id: parsedAccountId } });
        if (!account) {
          throw new Error("Account not found");
        }

        const updatedAccount = await tx.accounts.update({
          where: { id: parsedAccountId },
          data: { balance: { decrement: nextNet } }
        });

        const employeeName = updatedSalary.user?.name || updatedSalary.user?.username || `User#${updatedSalary.userId}`;

        await createTransaction(tx, {
          reference: `TRX-SAL-${Date.now()}-${updatedSalary.id}`,
          createdById: req.user?.userId || existingSalary.userId || 1,
          accountId: parsedAccountId,
          purpose: "Salary Payment",
          added_to_account: false,
          amount: nextNet,
          payment_method: "salary",
          current_account_balance: updatedAccount.balance,
          note: `Salary payment #${updatedSalary.id} ${updatedSalary.month}/${updatedSalary.year} - ${employeeName}`
        });
      }

      return updatedSalary;
    });

    if (finalStatus === "paid") {
      await createNotification(prisma, {
        title: `Salary disbursed (${result.month}/${result.year})`,
        description: `Salary payment was completed for ${result.user?.name || result.user?.username || `user #${result.userId}`}.`,
        forRole: "admin",
        link: "/hrm/payroll"
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual salary calculation fallback (if cron fails)
router.post("/payroll/calculate", async (req, res) => {
  try {
    const now = new Date();
    const month = req.body?.month ? parseInt(req.body.month) : (now.getMonth() + 1);
    const year = req.body?.year ? parseInt(req.body.year) : now.getFullYear();
    if (!month || month < 1 || month > 12 || !year || year < 2000 || year > 2100) {
      return res.status(400).json({ error: "Invalid month/year" });
    }

    await generateMonthlySalaries(year, month);
    const createdCount = await prisma.salary.count({ where: { month, year } });

    res.json({
      success: true,
      message: `Salary calculation completed for ${month}/${year}`,
      month,
      year,
      totalRecords: createdCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/payroll/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: "Invalid salary id" });
    const salaryBeforeDelete = await prisma.salary.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!salaryBeforeDelete) return res.status(404).json({ error: "Salary not found" });

    await prisma.$transaction(async (tx) => {
      const salary = await tx.salary.findUnique({ where: { id }, include: { user: true } });
      if (!salary) throw new Error("Salary not found");

      if (String(salary.status || "").toLowerCase() === "paid") {
        await rollbackAndDeleteTransactionsByWhere(tx, {
          purpose: "Salary Payment",
          OR: [
            { note: { contains: `#${salary.id}` } },
            { note: { contains: `Salary payment ${salary.month}/${salary.year}` } },
          ],
          amount: parseFloat(salary.net || 0),
        }, { reverseBalances: true });
      }

      await tx.expense.updateMany({
        where: { salaryId: id },
        data: { salaryId: null },
      });
      await tx.salary.delete({ where: { id } });
    });

    const summary = {
      salaryId: id,
      userId: salaryBeforeDelete.userId,
      employee: salaryBeforeDelete.user?.name || salaryBeforeDelete.user?.username || null,
      month: salaryBeforeDelete.month,
      year: salaryBeforeDelete.year,
      net: salaryBeforeDelete.net,
      status: salaryBeforeDelete.status,
      hadPaidRollback: String(salaryBeforeDelete.status || "").toLowerCase() === "paid",
    };
    req.setAuditTrail?.({
      action: "delete",
      entity: "salary",
      entityId: id,
      description: `Deleted salary #${id} (${salaryBeforeDelete.month}/${salaryBeforeDelete.year}) for user #${salaryBeforeDelete.userId}, net ${salaryBeforeDelete.net}.`,
      details: summary,
    });

    res.json({ success: true, message: "Salary deleted successfully", summary });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to delete salary" });
  }
});

module.exports = router;
